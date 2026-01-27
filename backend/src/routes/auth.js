const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('specialty').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password, firstName, lastName, phone, specialty, clinicName, clinicType } = req.body;

        // Check if user exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // Start transaction
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Create user
            const userResult = await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, phone, specialty, role)
         VALUES ($1, $2, $3, $4, $5, $6, 'practitioner')
         RETURNING id, email, first_name, last_name, role`,
                [email, passwordHash, firstName, lastName, phone, specialty]
            );

            const user = userResult.rows[0];

            // Create clinic if provided
            let clinic = null;
            if (clinicName) {
                const clinicResult = await client.query(
                    `INSERT INTO clinics (name, type)
           VALUES ($1, $2)
           RETURNING id, name, type`,
                    [clinicName, clinicType || 'general']
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

            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        role: user.role
                    },
                    clinic,
                    token
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
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        const result = await db.query(
            `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, 
              u.specialty, u.avatar_url, u.is_active, u.mfa_enabled,
              uc.clinic_id, uc.role as clinic_role, c.name as clinic_name, c.type as clinic_type
       FROM users u
       LEFT JOIN user_clinics uc ON u.id = uc.user_id
       LEFT JOIN clinics c ON uc.clinic_id = c.id
       WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(401).json({ success: false, message: 'Account is deactivated' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
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
                    avatarUrl: user.avatar_url,
                    clinicId: user.clinic_id,
                    clinicName: user.clinic_name,
                    clinicType: user.clinic_type,
                    clinicRole: user.clinic_role,
                    mfaEnabled: user.mfa_enabled
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, 
              u.specialty, u.license_number, u.avatar_url, u.mfa_enabled,
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
                avatarUrl: user.avatar_url,
                mfaEnabled: user.mfa_enabled,
                clinic: user.clinic_id ? {
                    id: user.clinic_id,
                    name: user.clinic_name,
                    type: user.clinic_type,
                    role: user.clinic_role,
                    settings: user.clinic_settings
                } : null
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
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
            data: result.rows[0]
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
