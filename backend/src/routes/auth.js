const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { resolveStoredUploadUrl, buildUploadUrl, ensureUploadDir } = require('../utils/uploads');
const { createPlatformAdminNotification } = require('../services/notificationCenter');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const router = express.Router();
const allowedClinicTypes = ['general', 'dental', 'aesthetic', 'veterinary', 'other'];

const profileImageDir = ensureUploadDir('profile-images');

const profileImageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profileImageDir),
    filename: (req, file, cb) => {
        const safeExt = path.extname(file.originalname || '').toLowerCase();
        cb(null, `${uuidv4()}${safeExt}`);
    }
});

const profileImageUpload = multer({
    storage: profileImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Invalid file type'));
    }
});

// Register new user
router.post('/register', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('specialty').optional().trim(),
    body('clinicName').trim().notEmpty().withMessage('Clinic name is required'),
    body('clinicType').optional().isIn(allowedClinicTypes).withMessage('Invalid clinic type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            specialty,
            clinicName,
            clinicType,
            clinicOtherType,
            clinicPhone,
            clinicAddress,
            clinicCity,
            clinicWebsite
        } = req.body;

        // Check if user exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Start transaction
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Create user
            const userResult = await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, phone, specialty, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, 'practitioner', false)
         RETURNING id, email, first_name, last_name, role, is_verified`,
                [email, passwordHash, firstName, lastName, phone, specialty]
            );

            const user = userResult.rows[0];

            // Create clinic if provided
            let clinic = null;
            if (clinicName) {
                const clinicResult = await client.query(
                    `INSERT INTO clinics (name, type, phone, address, city, website, settings)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, name, type`,
                    [
                        clinicName,
                        clinicType || 'general',
                        clinicPhone || null,
                        clinicAddress || null,
                        clinicCity || null,
                        clinicWebsite || null,
                        JSON.stringify({ customType: clinicType === 'other' ? clinicOtherType || '' : '' })
                    ]
                );
                clinic = clinicResult.rows[0];

                // Link user to clinic as admin
                await client.query(
                    `INSERT INTO user_clinics (user_id, clinic_id, role)
           VALUES ($1, $2, 'admin')`,
                    [user.id, clinic.id]
                );
            }

            await client.query('COMMIT');

            createPlatformAdminNotification({
                type: 'warning',
                title: 'Nouveau compte clinique à valider',
                message: `${firstName} ${lastName} a créé le compte ${clinicName}. Validation plateforme requise.`,
                url: '/admin/accounts',
                metadata: { userId: user.id, clinicId: clinic?.id, event: 'clinic_registration_pending' }
            }).catch((error) => console.error('Failed to notify platform admins:', error));

            res.status(201).json({
                success: true,
                message: 'Registration submitted. Your account is pending platform admin approval.',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        role: user.role,
                        isVerified: user.is_verified
                    },
                    clinic,
                    pendingApproval: true
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const rid = req.requestId || 'no-rid';
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.warn(`[AUTH][${rid}] Login validation failed`);
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        const result = await db.query(
            `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, 
              u.specialty, u.avatar_url, u.is_active, u.is_verified, u.mfa_enabled, u.access_permissions,
              u.assigned_practitioner_id,
              uc.clinic_id, uc.role as clinic_role, c.name as clinic_name, c.type as clinic_type
       FROM users u
       LEFT JOIN user_clinics uc ON u.id = uc.user_id
       LEFT JOIN clinics c ON uc.clinic_id = c.id
       WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            console.warn(`[AUTH][${rid}] Login failed: invalid credentials`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (user.role === 'patient') {
            console.warn(`[AUTH][${rid}] Login failed: patient used staff login`);
            return res.status(401).json({ success: false, message: 'Please use the patient login page' });
        }

        if (!user.is_active) {
            console.warn(`[AUTH][${rid}] Login failed: inactive account`);
            return res.status(401).json({ success: false, message: 'Account is deactivated' });
        }

        if (!user.is_verified) {
            console.warn(`[AUTH][${rid}] Login failed: account pending approval`);
            return res.status(403).json({ success: false, message: 'Account pending platform admin approval' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            console.warn(`[AUTH][${rid}] Login failed: invalid credentials`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    specialty: user.specialty,
                    avatarUrl: resolveStoredUploadUrl(user.avatar_url),
                    clinicId: user.clinic_id,
                    clinicName: user.clinic_name,
                    clinicType: user.clinic_type,
                    clinicRole: user.clinic_role,
                    mfaEnabled: user.mfa_enabled,
                    assignedPractitionerId: user.assigned_practitioner_id,
                    accessPermissions: user.access_permissions || {}
                },
                token
            }
        });
    } catch (error) {
        console.error(`[AUTH][${rid}] Login error:`, error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email } = req.body;
        const userResult = await db.query(
            `SELECT id, email
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const existing = await db.query(
                `SELECT id
                 FROM password_reset_requests
                 WHERE user_id = $1 AND status = 'pending'
                 ORDER BY requested_at DESC
                 LIMIT 1`,
                [user.id]
            );

            if (existing.rows.length > 0) {
                await db.query(
                    `UPDATE password_reset_requests
                     SET requested_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [existing.rows[0].id]
                );
            } else {
                await db.query(
                    `INSERT INTO password_reset_requests (user_id, email)
                     VALUES ($1, $2)`,
                    [user.id, user.email]
                );
            }

            createPlatformAdminNotification({
                type: 'warning',
                title: 'Mot de passe oublié',
                message: `${user.email} demande une réinitialisation de mot de passe.`,
                url: '/admin/accounts',
                metadata: { userId: user.id, event: 'password_reset_requested' }
            }).catch((error) => console.error('Failed to notify platform admins:', error));
        }

        res.json({
            success: true,
            message: 'If this account exists, a password reset request has been sent to the platform administrator.'
        });
    } catch (error) {
        console.error('Forgot password request error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit password reset request' });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, 
              u.specialty, u.license_number, u.avatar_url, u.mfa_enabled, u.access_permissions,
              u.assigned_practitioner_id,
              uc.clinic_id, uc.role as clinic_role, c.name as clinic_name, c.type as clinic_type,
              c.settings as clinic_settings
       FROM users u
       LEFT JOIN user_clinics uc ON u.id = uc.user_id
       LEFT JOIN clinics c ON uc.clinic_id = c.id
       WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                role: user.role,
                specialty: user.specialty,
                licenseNumber: user.license_number,
                avatarUrl: resolveStoredUploadUrl(user.avatar_url),
                mfaEnabled: user.mfa_enabled,
                clinic: user.clinic_id ? {
                    id: user.clinic_id,
                    name: user.clinic_name,
                    type: user.clinic_type,
                    role: user.clinic_role,
                    settings: user.clinic_settings
                } : null,
                accessPermissions: user.access_permissions || {},
                assignedPractitionerId: user.assigned_practitioner_id
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
});

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, email, first_name, last_name, phone, specialty, bio,
                    consultation_fee, accepts_online, payment_policy, avatar_url
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone || '',
                specialty: user.specialty || '',
                bio: user.bio || '',
                consultationFee: parseFloat(user.consultation_fee) || 50,
                acceptsOnline: Boolean(user.accepts_online),
                paymentPolicy: user.payment_policy || 'full-onsite',
                avatarUrl: resolveStoredUploadUrl(user.avatar_url)
            }
        });
    } catch (error) {
        console.error('Get doctor profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
});

router.put('/me', authMiddleware, [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().trim()
], async (req, res) => {
    try {
        const { firstName, lastName, phone, specialty, licenseNumber } = req.body;

        const result = await db.query(
            `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           specialty = COALESCE($4, specialty),
           license_number = COALESCE($5, license_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, email, first_name, last_name, phone, specialty, license_number`,
            [firstName, lastName, phone, specialty, licenseNumber, req.user.id]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                firstName: result.rows[0].first_name,
                lastName: result.rows[0].last_name,
                phone: result.rows[0].phone || '',
                specialty: result.rows[0].specialty || '',
                bio: result.rows[0].bio || '',
                consultationFee: parseFloat(result.rows[0].consultation_fee) || 50,
                acceptsOnline: Boolean(result.rows[0].accepts_online),
                paymentPolicy: result.rows[0].payment_policy || 'full-onsite',
                avatarUrl: resolveStoredUploadUrl(result.rows[0].avatar_url)
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Update profile with avatar
router.put('/profile', authMiddleware, profileImageUpload.single('avatar'), async (req, res) => {
    try {
        const { firstName, lastName, phone, specialty, bio, consultationFee, acceptsOnline, paymentPolicy } = req.body;

        let avatarUrl = null;
        if (req.file) {
            avatarUrl = buildUploadUrl('profile-images', req.file.filename);
        }

        const result = await db.query(
            `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           specialty = COALESCE($4, specialty),
           bio = COALESCE($5, bio),
           consultation_fee = COALESCE($6, consultation_fee),
           accepts_online = COALESCE($7, accepts_online),
           payment_policy = COALESCE($8, payment_policy),
           avatar_url = COALESCE($9, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING id, email, first_name, last_name, phone, specialty, bio, consultation_fee, accepts_online, payment_policy, avatar_url`,
            [firstName, lastName, phone, specialty, bio, consultationFee, acceptsOnline, paymentPolicy, avatarUrl, req.user.id]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                firstName: result.rows[0].first_name,
                lastName: result.rows[0].last_name,
                phone: result.rows[0].phone || '',
                specialty: result.rows[0].specialty || '',
                bio: result.rows[0].bio || '',
                consultationFee: parseFloat(result.rows[0].consultation_fee) || 50,
                acceptsOnline: Boolean(result.rows[0].accepts_online),
                paymentPolicy: result.rows[0].payment_policy || 'full-onsite',
                avatarUrl: resolveStoredUploadUrl(result.rows[0].avatar_url)
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

router.put('/change-password', authMiddleware, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(12);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
});

router.post('/logout', authMiddleware, (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
