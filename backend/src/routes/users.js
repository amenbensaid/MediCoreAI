const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { buildUploadUrl, ensureUploadDir, resolveStoredUploadUrl } = require('../utils/uploads');
const {
    buildGoogleAuthUrl,
    disconnectGoogleCalendar,
    exchangeCodeForTokens,
    fetchGoogleProfile,
    getGoogleCalendarStatus,
    getGoogleConfig,
    storeGoogleTokens
} = require('../services/googleCalendar');
const { getMeetingProviderStatus } = require('../services/jitsi');
const { createClinicAdminNotification, createPlatformAdminNotification } = require('../services/notificationCenter');
const { normalizeCalendarPreferences } = require('../utils/calendarPreferences');
const { isClinicAdminUser } = require('../utils/staffScope');

const router = express.Router();

const profileImageDir = ensureUploadDir('profile-images');

const profileImageUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, profileImageDir),
        filename: (req, file, cb) => {
            const safeExt = path.extname(file.originalname || '').toLowerCase();
            cb(null, `${uuidv4()}${safeExt}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Invalid image type'));
    }
});

const defaultNotificationPreferences = {
    appointmentEmail: true,
    smsAlerts: false,
    dailyReport: true,
    aiAlerts: true
};

const defaultAppearancePreferences = {
    darkMode: false,
    accentColor: '#6366f1'
};

const clinicTypes = ['general', 'dental', 'aesthetic', 'veterinary', 'other'];
const allowedPolicies = ['full-onsite', 'deposit-30'];
const secretaryPermissionDefaults = {
    dashboard: true,
    patients: true,
    appointments: true,
    calendar: true,
    teleconsultations: false,
    reviews: false,
    billing: false,
    analytics: false,
    settings: false
};

const normalizeSecretaryPermissions = (permissions = {}) => Object.fromEntries(
    Object.keys(secretaryPermissionDefaults).map((key) => [
        key,
        Boolean(permissions[key] ?? secretaryPermissionDefaults[key])
    ])
);

const buildSecretaryPayload = (row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || '',
    isActive: Boolean(row.is_active),
    practitionerId: row.assigned_practitioner_id || null,
    practitionerName: row.practitioner_first_name
        ? `Dr. ${row.practitioner_first_name} ${row.practitioner_last_name}`
        : null,
    permissions: normalizeSecretaryPermissions(row.access_permissions || {}),
    createdAt: row.created_at,
    lastLogin: row.last_login
});

const normalizeAvatarUrl = (value) => {
    const nextValue = String(value || '').trim();
    if (!nextValue) return null;

    if (nextValue.startsWith('/uploads/')) {
        return nextValue;
    }

    try {
        const parsed = new URL(nextValue);
        if (['http:', 'https:'].includes(parsed.protocol)) {
            return nextValue;
        }
    } catch (error) {
        return null;
    }

    return null;
};

const getUploadedAvatarUrl = (file) => (
    file ? buildUploadUrl('profile-images', path.basename(file.path)) : null
);

const buildPractitionerAdminPayload = (row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `Dr. ${row.first_name} ${row.last_name}`,
    phone: row.phone || '',
    specialty: row.specialty || '',
    licenseNumber: row.license_number || '',
    avatarUrl: row.avatar_url ? resolveStoredUploadUrl(row.avatar_url) : null,
    isActive: Boolean(row.is_active),
    consultationFee: parseFloat(row.consultation_fee) || 0,
    acceptsOnline: Boolean(row.accepts_online),
    paymentPolicy: row.payment_policy || 'full-onsite',
    bio: row.bio || '',
    clinicRole: row.clinic_role || 'practitioner',
    createdAt: row.created_at,
    metrics: {
        patients: Number(row.patient_count || 0),
        appointments: Number(row.appointment_count || 0),
        upcomingAppointments: Number(row.upcoming_appointment_count || 0),
        revenue: parseFloat(row.revenue_total || 0),
        collected: parseFloat(row.revenue_collected || 0),
        outstanding: parseFloat(row.revenue_outstanding || 0),
        secretaries: Number(row.secretary_count || 0),
        rating: parseFloat(row.average_rating || 0),
        reviews: Number(row.review_count || 0)
    }
});

const assertPractitionerInClinic = async (client, practitionerId, clinicId) => {
    if (!practitionerId) return true;

    const result = await client.query(
        `SELECT u.id
         FROM users u
         JOIN user_clinics uc ON uc.user_id = u.id
         WHERE u.id = $1
           AND uc.clinic_id = $2
           AND u.role = 'practitioner'`,
        [practitionerId, clinicId]
    );

    return result.rows.length > 0;
};

const getValidationMessage = (req) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return null;
    }

    return errors.array()[0]?.msg || 'Invalid request';
};

const buildUserPayload = (row) => ({
    profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone || '',
        specialty: row.specialty || '',
        licenseNumber: row.license_number || '',
        avatarUrl: resolveStoredUploadUrl(row.avatar_url)
    },
    clinic: row.clinic_id ? {
        id: row.clinic_id,
        name: row.clinic_name || '',
        type: row.clinic_type || 'general',
        address: row.clinic_address || '',
        city: row.clinic_city || '',
        postalCode: row.clinic_postal_code || '',
        country: row.clinic_country || 'France',
        phone: row.clinic_phone || '',
        email: row.clinic_email || '',
        website: row.clinic_website || ''
    } : null,
    notifications: {
        ...defaultNotificationPreferences,
        ...(row.notification_preferences || {})
    },
    appearance: {
        ...defaultAppearancePreferences,
        ...(row.appearance_preferences || {})
    },
    security: {
        mfaEnabled: Boolean(row.mfa_enabled)
    },
    integrations: {
        googleCalendar: {
            connected: Boolean(row.google_calendar_connected),
            email: row.google_calendar_email || null
        }
    }
});

const requireClinicAdmin = (req, res) => {
    if (!req.user.clinicId) {
        res.status(400).json({ success: false, message: 'No clinic linked to this user' });
        return false;
    }

    if (req.user.role !== 'admin' && req.user.clinicRole !== 'admin') {
        res.status(403).json({ success: false, message: 'Clinic admin access required' });
        return false;
    }

    return true;
};

router.get('/me/settings', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.specialty,
                    u.license_number, u.avatar_url, u.mfa_enabled,
                    u.notification_preferences, u.appearance_preferences,
                    u.google_calendar_connected, u.google_calendar_email,
                    c.id AS clinic_id, c.name AS clinic_name, c.type AS clinic_type,
                    c.address AS clinic_address, c.city AS clinic_city,
                    c.postal_code AS clinic_postal_code, c.country AS clinic_country,
                    c.phone AS clinic_phone, c.email AS clinic_email, c.website AS clinic_website
             FROM users u
             LEFT JOIN user_clinics uc ON u.id = uc.user_id
             LEFT JOIN clinics c ON uc.clinic_id = c.id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: buildUserPayload(result.rows[0])
        });
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
});

router.put('/me/profile', authMiddleware, profileImageUpload.single('avatar'), [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('phone').optional({ nullable: true }).trim(),
    body('specialty').optional({ nullable: true }).trim(),
    body('licenseNumber').optional({ nullable: true }).trim(),
    body('avatarUrl').optional({ nullable: true }).trim()
], async (req, res) => {
    const message = getValidationMessage(req);
    if (message) {
        return res.status(400).json({ success: false, message });
    }

    try {
        const { firstName, lastName, phone, specialty, licenseNumber } = req.body;
        const avatarUrl = getUploadedAvatarUrl(req.file) || normalizeAvatarUrl(req.body.avatarUrl);

        const result = await db.query(
            `UPDATE users
             SET first_name = $1,
                 last_name = $2,
                 phone = $3,
                 specialty = $4,
                 license_number = $5,
                 avatar_url = COALESCE($6, avatar_url),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING id, email, first_name, last_name, phone, specialty, license_number, avatar_url`,
            [firstName, lastName, phone || null, specialty || null, licenseNumber || null, avatarUrl, req.user.id]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                firstName: result.rows[0].first_name,
                lastName: result.rows[0].last_name,
                email: result.rows[0].email,
                phone: result.rows[0].phone || '',
                specialty: result.rows[0].specialty || '',
                licenseNumber: result.rows[0].license_number || '',
                avatarUrl: resolveStoredUploadUrl(result.rows[0].avatar_url)
            }
        });
    } catch (error) {
        console.error('Failed to update profile:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

router.put('/me/clinic-settings', authMiddleware, [
    body('name').trim().notEmpty().withMessage('Clinic name is required'),
    body('type').isIn(clinicTypes).withMessage('Invalid clinic type'),
    body('address').optional({ values: 'falsy' }).trim(),
    body('city').optional({ values: 'falsy' }).trim(),
    body('postalCode').optional({ values: 'falsy' }).trim(),
    body('country').optional({ values: 'falsy' }).trim(),
    body('phone').optional({ values: 'falsy' }).trim(),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Clinic email is invalid'),
    body('website').optional({ values: 'falsy' }).trim()
], async (req, res) => {
    if (!requireClinicAdmin(req, res)) {
        return;
    }

    const message = getValidationMessage(req);
    if (message) {
        return res.status(400).json({ success: false, message });
    }

    try {
        const { name, type, address, city, postalCode, country, phone, email, website } = req.body;

        const result = await db.query(
            `UPDATE clinics
             SET name = $1,
                 type = $2,
                 address = $3,
                 city = $4,
                 postal_code = $5,
                 country = $6,
                 phone = $7,
                 email = $8,
                 website = $9,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $10
             RETURNING id, name, type, address, city, postal_code, country, phone, email, website`,
            [
                name,
                type,
                address || null,
                city || null,
                postalCode || null,
                country || 'France',
                phone || null,
                email || null,
                website || null,
                req.user.clinicId
            ]
        );

        res.json({
            success: true,
            message: 'Clinic settings updated successfully',
            data: {
                id: result.rows[0].id,
                name: result.rows[0].name,
                type: result.rows[0].type,
                address: result.rows[0].address || '',
                city: result.rows[0].city || '',
                postalCode: result.rows[0].postal_code || '',
                country: result.rows[0].country || 'France',
                phone: result.rows[0].phone || '',
                email: result.rows[0].email || '',
                website: result.rows[0].website || ''
            }
        });
    } catch (error) {
        console.error('Failed to update clinic settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update clinic settings' });
    }
});

router.put('/me/preferences', authMiddleware, async (req, res) => {
    try {
        const { notifications, appearance } = req.body;
        const accentColor = appearance?.accentColor;

        if (accentColor && !/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
            return res.status(400).json({ success: false, message: 'Invalid accent color' });
        }

        const current = await db.query(
            `SELECT notification_preferences, appearance_preferences
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const nextNotifications = notifications
            ? {
                ...defaultNotificationPreferences,
                ...(current.rows[0].notification_preferences || {}),
                ...notifications
            }
            : {
                ...defaultNotificationPreferences,
                ...(current.rows[0].notification_preferences || {})
            };

        const nextAppearance = appearance
            ? {
                ...defaultAppearancePreferences,
                ...(current.rows[0].appearance_preferences || {}),
                ...appearance
            }
            : {
                ...defaultAppearancePreferences,
                ...(current.rows[0].appearance_preferences || {})
            };

        const result = await db.query(
            `UPDATE users
             SET notification_preferences = $1,
                 appearance_preferences = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING notification_preferences, appearance_preferences`,
            [JSON.stringify(nextNotifications), JSON.stringify(nextAppearance), req.user.id]
        );

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            data: {
                notifications: {
                    ...defaultNotificationPreferences,
                    ...(result.rows[0].notification_preferences || {})
                },
                appearance: {
                    ...defaultAppearancePreferences,
                    ...(result.rows[0].appearance_preferences || {})
                }
            }
        });
    } catch (error) {
        console.error('Failed to update preferences:', error);
        res.status(500).json({ success: false, message: 'Failed to update preferences' });
    }
});

router.put('/me/security', authMiddleware, async (req, res) => {
    try {
        const { mfaEnabled } = req.body;

        if (typeof mfaEnabled !== 'boolean') {
            return res.status(400).json({ success: false, message: 'mfaEnabled must be a boolean' });
        }

        const result = await db.query(
            `UPDATE users
             SET mfa_enabled = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING mfa_enabled`,
            [mfaEnabled, req.user.id]
        );

        res.json({
            success: true,
            message: 'Security settings updated successfully',
            data: {
                mfaEnabled: Boolean(result.rows[0].mfa_enabled)
            }
        });
    } catch (error) {
        console.error('Failed to update security settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update security settings' });
    }
});

router.get('/me/google-calendar-status', authMiddleware, async (req, res) => {
    try {
        console.log('[GOOGLE][STATUS] Request received', {
            userId: req.user.id,
            email: req.user.email
        });
        const status = await getGoogleCalendarStatus(req.user.id);
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('Failed to fetch Google Calendar status:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch Google Calendar status' });
    }
});

router.get('/me/meeting-provider-status', authMiddleware, async (req, res) => {
    try {
        res.json({
            success: true,
            data: getMeetingProviderStatus()
        });
    } catch (error) {
        console.error('Failed to fetch meeting provider status:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch meeting provider status' });
    }
});

router.get('/me/google-calendar/auth-url', authMiddleware, async (req, res) => {
    try {
        console.log('[GOOGLE][AUTH_URL] Request received', {
            userId: req.user.id,
            email: req.user.email
        });
        getGoogleConfig();

        const state = jwt.sign(
            {
                userId: req.user.id,
                type: 'google-calendar-connect'
            },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.json({
            success: true,
            data: {
                url: buildGoogleAuthUrl({ state })
            }
        });
    } catch (error) {
        console.error('[GOOGLE][AUTH_URL] Failed to build Google auth URL', {
            userId: req.user?.id || null,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ success: false, message: error.message || 'Google Calendar integration is unavailable' });
    }
});

router.get('/google-calendar/callback', async (req, res) => {
    const frontendOrigin = process.env.FRONTEND_URL || '*';

    const respondWithPopup = (payload) => {
        const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c');
        res.send(`<!doctype html>
<html>
  <body>
    <script>
      (function () {
        var payload = ${safePayload};
        if (window.opener) {
          window.opener.postMessage(payload, ${JSON.stringify(frontendOrigin)});
        }
        window.close();
      })();
    </script>
  </body>
</html>`);
    };

    try {
        const { code, state } = req.query;
        console.log('[GOOGLE][CALLBACK] Callback received', {
            hasCode: Boolean(code),
            hasState: Boolean(state),
            frontendOrigin
        });
        if (!code || !state) {
            return respondWithPopup({
                type: 'medicore-google-calendar',
                success: false,
                message: 'Missing Google callback parameters'
            });
        }

        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        console.log('[GOOGLE][CALLBACK] State verified', {
            userId: decoded.userId,
            type: decoded.type
        });
        if (decoded.type !== 'google-calendar-connect' || !decoded.userId) {
            throw new Error('Invalid OAuth state');
        }

        const tokens = await exchangeCodeForTokens(code);
        const googleProfile = await fetchGoogleProfile(tokens.access_token);

        await storeGoogleTokens({
            userId: decoded.userId,
            tokens,
            googleEmail: googleProfile.email || null
        });

        return respondWithPopup({
            type: 'medicore-google-calendar',
            success: true,
            email: googleProfile.email || null
        });
    } catch (error) {
        console.error('[GOOGLE][CALLBACK] Google Calendar callback failed', {
            message: error.message,
            stack: error.stack
        });
        return respondWithPopup({
            type: 'medicore-google-calendar',
            success: false,
            message: error.message || 'Google Calendar connection failed'
        });
    }
});

router.delete('/me/google-calendar', authMiddleware, async (req, res) => {
    try {
        console.log('[GOOGLE][DISCONNECT] Request received', {
            userId: req.user.id,
            email: req.user.email
        });
        await disconnectGoogleCalendar(req.user.id);
        res.json({ success: true, message: 'Google Calendar disconnected' });
    } catch (error) {
        console.error('Failed to disconnect Google Calendar:', error);
        res.status(500).json({ success: false, message: 'Failed to disconnect Google Calendar' });
    }
});

router.get('/me/consultation-settings', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, role, specialty, consultation_fee, accepts_online, payment_policy, bio, calendar_preferences
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
                specialty: user.specialty,
                consultationFee: parseFloat(user.consultation_fee) || 50,
                acceptsOnline: user.accepts_online,
                paymentPolicy: user.payment_policy || 'full-onsite',
                bio: user.bio || '',
                calendar: normalizeCalendarPreferences(user.calendar_preferences)
            }
        });
    } catch (error) {
        console.error('Failed to fetch consultation settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch consultation settings' });
    }
});

router.put('/me/consultation-settings', authMiddleware, async (req, res) => {
    try {
        const { consultationFee, acceptsOnline, paymentPolicy, bio, calendar } = req.body;

        if (paymentPolicy && !allowedPolicies.includes(paymentPolicy)) {
            return res.status(400).json({ success: false, message: 'Invalid payment policy' });
        }

        if (consultationFee !== undefined && (Number.isNaN(Number(consultationFee)) || Number(consultationFee) < 0)) {
            return res.status(400).json({ success: false, message: 'Invalid consultation fee' });
        }

        const result = await db.query(
            `UPDATE users
             SET consultation_fee = COALESCE($1, consultation_fee),
                 accepts_online = COALESCE($2, accepts_online),
                 payment_policy = COALESCE($3, payment_policy),
                 bio = COALESCE($4, bio),
                 calendar_preferences = COALESCE($5::jsonb, calendar_preferences),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING consultation_fee, accepts_online, payment_policy, bio, calendar_preferences`,
            [
                consultationFee !== undefined ? Number(consultationFee) : null,
                acceptsOnline !== undefined ? Boolean(acceptsOnline) : null,
                paymentPolicy || null,
                bio !== undefined ? bio : null,
                calendar !== undefined ? JSON.stringify(normalizeCalendarPreferences(calendar)) : null,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Consultation settings updated',
            data: {
                consultationFee: parseFloat(result.rows[0].consultation_fee) || 50,
                acceptsOnline: result.rows[0].accepts_online,
                paymentPolicy: result.rows[0].payment_policy,
                bio: result.rows[0].bio || '',
                calendar: normalizeCalendarPreferences(result.rows[0].calendar_preferences)
            }
        });
    } catch (error) {
        console.error('Failed to update consultation settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update consultation settings' });
    }
});

router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.specialty,
                    u.is_active, u.created_at, uc.role AS clinic_role
             FROM users u
             LEFT JOIN user_clinics uc ON u.id = uc.user_id AND uc.clinic_id = $1
             WHERE uc.clinic_id = $1
             ORDER BY u.created_at DESC`,
            [req.user.clinicId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

router.get('/platform/accounts', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { status = 'all', role = 'all', search = '' } = req.query;
        const params = [];
        const filters = [];

        if (status === 'pending') filters.push('u.is_verified = false AND u.is_active = true');
        if (status === 'approved') filters.push('u.is_verified = true AND u.is_active = true');
        if (status === 'disabled') filters.push('u.is_active = false');

        if (role !== 'all') {
            params.push(role);
            filters.push(`u.role = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            filters.push(`(
                u.email ILIKE $${params.length}
                OR u.first_name ILIKE $${params.length}
                OR u.last_name ILIKE $${params.length}
                OR COALESCE(c.name, '') ILIKE $${params.length}
            )`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.specialty,
                    u.is_active, u.is_verified, u.created_at, u.last_login,
                    u.assigned_practitioner_id,
                    c.id AS clinic_id, c.name AS clinic_name, c.type AS clinic_type,
                    c.phone AS clinic_phone, c.city AS clinic_city, c.settings AS clinic_settings,
                    uc.role AS clinic_role,
                    practitioner.first_name AS practitioner_first_name,
                    practitioner.last_name AS practitioner_last_name
             FROM users u
             LEFT JOIN user_clinics uc ON uc.user_id = u.id
             LEFT JOIN clinics c ON c.id = uc.clinic_id
             LEFT JOIN users practitioner ON practitioner.id = u.assigned_practitioner_id
             ${whereClause}
             ORDER BY u.is_verified ASC, u.created_at DESC`,
            params
        );

        const statsResult = await db.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE is_verified = false AND is_active = true)::int AS pending,
                COUNT(*) FILTER (WHERE is_verified = true AND is_active = true)::int AS approved,
                COUNT(*) FILTER (WHERE is_active = false)::int AS disabled
             FROM users`
        );

        res.json({
            success: true,
            data: {
                accounts: result.rows.map((row) => ({
                    id: row.id,
                    email: row.email,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    fullName: `${row.first_name} ${row.last_name}`,
                    phone: row.phone,
                    role: row.role,
                    specialty: row.specialty,
                    isActive: Boolean(row.is_active),
                    isVerified: Boolean(row.is_verified),
                    createdAt: row.created_at,
                    lastLogin: row.last_login,
                    assignedPractitionerId: row.assigned_practitioner_id,
                    assignedPractitionerName: row.practitioner_first_name ? `Dr. ${row.practitioner_first_name} ${row.practitioner_last_name}` : null,
                    clinic: row.clinic_id ? {
                        id: row.clinic_id,
                        name: row.clinic_name,
                        type: row.clinic_type,
                        customType: row.clinic_settings?.customType || '',
                        phone: row.clinic_phone,
                        city: row.clinic_city,
                        role: row.clinic_role
                    } : null
                })),
                stats: statsResult.rows[0]
            }
        });
    } catch (error) {
        console.error('Failed to fetch platform accounts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch platform accounts' });
    }
});

router.get('/platform/password-reset-requests', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT pr.id, pr.email, pr.status, pr.requested_at, pr.resolved_at,
                    u.id AS user_id, u.first_name, u.last_name, u.role, u.is_active, u.is_verified,
                    c.name AS clinic_name
             FROM password_reset_requests pr
             LEFT JOIN users u ON u.id = pr.user_id
             LEFT JOIN user_clinics uc ON uc.user_id = u.id
             LEFT JOIN clinics c ON c.id = uc.clinic_id
             WHERE pr.status = 'pending'
             ORDER BY pr.requested_at DESC
             LIMIT 50`
        );

        res.json({
            success: true,
            data: result.rows.map((row) => ({
                id: row.id,
                email: row.email,
                status: row.status,
                requestedAt: row.requested_at,
                resolvedAt: row.resolved_at,
                userId: row.user_id,
                fullName: row.first_name ? `${row.first_name} ${row.last_name}` : row.email,
                role: row.role || 'user',
                clinicName: row.clinic_name,
                isActive: Boolean(row.is_active),
                isVerified: Boolean(row.is_verified)
            }))
        });
    } catch (error) {
        console.error('Failed to fetch password reset requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch password reset requests' });
    }
});

router.patch('/platform/password-reset-requests/:id', authMiddleware, requireRole('admin'), [
    body('action').isIn(['complete', 'dismiss']).withMessage('Invalid action'),
    body('newPassword').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { action, newPassword } = req.body;
        const requestResult = await db.query(
            `SELECT pr.id, pr.user_id, pr.status, u.email
             FROM password_reset_requests pr
             LEFT JOIN users u ON u.id = pr.user_id
             WHERE pr.id = $1`,
            [req.params.id]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Password reset request not found' });
        }

        const request = requestResult.rows[0];
        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Password reset request already resolved' });
        }

        if (action === 'dismiss') {
            await db.query(
                `UPDATE password_reset_requests
                 SET status = 'dismissed',
                     resolved_at = CURRENT_TIMESTAMP,
                     resolved_by_user_id = $2
                 WHERE id = $1`,
                [request.id, req.user.id]
            );
            return res.json({ success: true, message: 'Password reset request dismissed' });
        }

        if (!request.user_id) {
            return res.status(404).json({ success: false, message: 'Linked account not found' });
        }

        if (!newPassword) {
            return res.status(400).json({ success: false, message: 'New password is required' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            await client.query(
                `UPDATE users
                 SET password_hash = $1,
                     is_active = true,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [passwordHash, request.user_id]
            );
            await client.query(
                `UPDATE password_reset_requests
                 SET status = 'completed',
                     temporary_password_set = true,
                     resolved_at = CURRENT_TIMESTAMP,
                     resolved_by_user_id = $2
                 WHERE id = $1`,
                [request.id, req.user.id]
            );
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        res.json({ success: true, message: 'Temporary password saved' });
    } catch (error) {
        console.error('Failed to resolve password reset request:', error);
        res.status(500).json({ success: false, message: 'Failed to resolve password reset request' });
    }
});

router.patch('/platform/accounts/:id/approval', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { action } = req.body;
        if (!['approve', 'reject', 'disable', 'reactivate'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const updates = {
            approve: { isVerified: true, isActive: true },
            reject: { isVerified: false, isActive: false },
            disable: { isVerified: true, isActive: false },
            reactivate: { isVerified: true, isActive: true }
        }[action];

        const result = await db.query(
            `UPDATE users
             SET is_verified = $1,
                 is_active = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, is_verified, is_active`,
            [updates.isVerified, updates.isActive, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Failed to update account approval:', error);
        res.status(500).json({ success: false, message: 'Failed to update account approval' });
    }
});

router.get('/secretaries', authMiddleware, async (req, res) => {
    const canManageTeam = isClinicAdminUser(req.user) || req.user.role === 'practitioner';
    if (!canManageTeam) {
        return res.status(403).json({ success: false, message: 'Team management access required' });
    }

    try {
        const params = [req.user.clinicId];
        let practitionerClause = '';
        if (req.user.role === 'practitioner' && !isClinicAdminUser(req.user)) {
            params.push(req.user.id);
            practitionerClause = `AND u.assigned_practitioner_id = $${params.length}`;
        }

        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active,
                    u.access_permissions, u.assigned_practitioner_id, u.created_at, u.last_login,
                    practitioner.first_name AS practitioner_first_name,
                    practitioner.last_name AS practitioner_last_name
             FROM users u
             JOIN user_clinics uc ON uc.user_id = u.id
             LEFT JOIN users practitioner ON practitioner.id = u.assigned_practitioner_id
             WHERE uc.clinic_id = $1 AND u.role = 'secretary'
               ${practitionerClause}
             ORDER BY u.created_at DESC`,
            params
        );

        res.json({ success: true, data: result.rows.map(buildSecretaryPayload) });
    } catch (error) {
        console.error('Failed to fetch secretaries:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch secretaries' });
    }
});

router.post('/secretaries', authMiddleware, [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required')
], async (req, res) => {
    const canManageTeam = isClinicAdminUser(req.user) || req.user.role === 'practitioner';
    if (!canManageTeam) {
        return res.status(403).json({ success: false, message: 'Team management access required' });
    }

    const message = getValidationMessage(req);
    if (message) return res.status(400).json({ success: false, message });

    const { email, password, firstName, lastName, phone, permissions, practitionerId } = req.body;
    const resolvedPractitionerId = req.user.role === 'practitioner' && !isClinicAdminUser(req.user)
        ? req.user.id
        : practitionerId || null;
    const normalizedPermissions = normalizeSecretaryPermissions(permissions);
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        if (resolvedPractitionerId && !(await assertPractitionerInClinic(client, resolvedPractitionerId, req.user.clinicId))) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Assigned practitioner not found' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userResult = await client.query(
            `INSERT INTO users (
                email, password_hash, first_name, last_name, phone, role,
                is_verified, access_permissions, created_by_user_id, assigned_practitioner_id
             ) VALUES ($1,$2,$3,$4,$5,'secretary',true,$6,$7,$8)
             RETURNING id, email, first_name, last_name, phone, is_active, access_permissions,
                       assigned_practitioner_id, created_at, last_login`,
            [email, passwordHash, firstName, lastName, phone || null, JSON.stringify(normalizedPermissions), req.user.id, resolvedPractitionerId]
        );

        await client.query(
            `INSERT INTO user_clinics (user_id, clinic_id, role)
             VALUES ($1, $2, 'secretary')`,
            [userResult.rows[0].id, req.user.clinicId]
        );

        await client.query('COMMIT');

        createClinicAdminNotification({
            clinicId: req.user.clinicId,
            type: 'success',
            title: 'Nouveau compte secrétaire',
            message: `${firstName} ${lastName} a été ajouté comme secrétaire.`,
            url: '/settings',
            metadata: { userId: userResult.rows[0].id, event: 'secretary_created' },
            excludeUserId: req.user.id
        }).catch((error) => console.error('Failed to notify clinic admins:', error));

        createPlatformAdminNotification({
            type: 'info',
            title: 'Nouveau compte secrétaire',
            message: `${firstName} ${lastName} a été créé dans une clinique.`,
            url: '/admin/accounts',
            metadata: { userId: userResult.rows[0].id, clinicId: req.user.clinicId, event: 'secretary_created' }
        }).catch((error) => console.error('Failed to notify platform admins:', error));

        res.status(201).json({
            success: true,
            message: 'Secretary account created',
            data: {
                secretary: buildSecretaryPayload(userResult.rows[0]),
                credentials: { email, password }
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to create secretary:', error);
        res.status(500).json({ success: false, message: 'Failed to create secretary' });
    } finally {
        client.release();
    }
});

router.put('/secretaries/:id', authMiddleware, async (req, res) => {
    const canManageTeam = isClinicAdminUser(req.user) || req.user.role === 'practitioner';
    if (!canManageTeam) {
        return res.status(403).json({ success: false, message: 'Team management access required' });
    }

    const { firstName, lastName, phone, permissions, isActive, password, practitionerId } = req.body;
    const resolvedPractitionerId = req.user.role === 'practitioner' && !isClinicAdminUser(req.user)
        ? req.user.id
        : practitionerId;
    const normalizedPermissions = permissions ? normalizeSecretaryPermissions(permissions) : null;

    try {
        if (resolvedPractitionerId && !(await assertPractitionerInClinic(db, resolvedPractitionerId, req.user.clinicId))) {
            return res.status(400).json({ success: false, message: 'Assigned practitioner not found' });
        }

        const params = [
            firstName || null,
            lastName || null,
            phone ?? null,
            normalizedPermissions ? JSON.stringify(normalizedPermissions) : null,
            typeof isActive === 'boolean' ? isActive : null,
            resolvedPractitionerId === null || resolvedPractitionerId ? resolvedPractitionerId : undefined,
            req.params.id,
            req.user.clinicId,
            isClinicAdminUser(req.user),
            req.user.id
        ];
        let passwordClause = '';

        if (password) {
            if (String(password).length < 8) {
                return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
            }
            params.push(await bcrypt.hash(password, 10));
            passwordClause = `, password_hash = $${params.length}`;
        }

        const result = await db.query(
            `UPDATE users u
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 phone = COALESCE($3, phone),
                 access_permissions = COALESCE($4, access_permissions),
                 is_active = COALESCE($5, is_active),
                 assigned_practitioner_id = CASE WHEN $6::text IS NULL THEN assigned_practitioner_id ELSE NULLIF($6::text, '')::uuid END,
                 updated_at = CURRENT_TIMESTAMP
                 ${passwordClause}
             FROM user_clinics uc
             WHERE u.id = $7
               AND uc.user_id = u.id
               AND uc.clinic_id = $8
               AND u.role = 'secretary'
               AND ($9::boolean = true OR u.assigned_practitioner_id = $10)
             RETURNING u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active,
                       u.access_permissions, u.assigned_practitioner_id, u.created_at, u.last_login`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Secretary not found' });
        }

        res.json({
            success: true,
            message: 'Secretary updated',
            data: buildSecretaryPayload(result.rows[0])
        });
    } catch (error) {
        console.error('Failed to update secretary:', error);
        res.status(500).json({ success: false, message: 'Failed to update secretary' });
    }
});

router.delete('/secretaries/:id', authMiddleware, async (req, res) => {
    const canManageTeam = isClinicAdminUser(req.user) || req.user.role === 'practitioner';
    if (!canManageTeam) {
        return res.status(403).json({ success: false, message: 'Team management access required' });
    }

    try {
        const result = await db.query(
            `DELETE FROM users u
             USING user_clinics uc
             WHERE u.id = $1
               AND uc.user_id = u.id
               AND uc.clinic_id = $2
               AND u.role = 'secretary'
               AND ($3::boolean = true OR u.assigned_practitioner_id = $4)
             RETURNING u.id`,
            [req.params.id, req.user.clinicId, isClinicAdminUser(req.user), req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Secretary not found' });
        }

        res.json({ success: true, message: 'Secretary deleted' });
    } catch (error) {
        console.error('Failed to delete secretary:', error);
        res.status(500).json({ success: false, message: 'Failed to delete secretary' });
    }
});

router.get('/practitioners/admin', authMiddleware, async (req, res) => {
    if (!requireClinicAdmin(req, res)) return;

    try {
        const { search = '', status = 'all' } = req.query;
        const params = [req.user.clinicId];
        const filters = [
            `uc.clinic_id = $1`,
            `u.role = 'practitioner'`
        ];

        if (status === 'active') {
            filters.push('u.is_active = true');
        } else if (status === 'inactive') {
            filters.push('u.is_active = false');
        }

        const normalizedSearch = String(search || '').trim();
        if (normalizedSearch) {
            params.push(`%${normalizedSearch}%`);
            filters.push(`(
                u.first_name ILIKE $${params.length}
                OR u.last_name ILIKE $${params.length}
                OR u.email ILIKE $${params.length}
                OR COALESCE(u.specialty, '') ILIKE $${params.length}
            )`);
        }

        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.specialty,
                    u.license_number, u.avatar_url, u.is_active, u.created_at,
                    u.consultation_fee, u.accepts_online, u.payment_policy, u.bio,
                    uc.role AS clinic_role,
                    COALESCE(patient_stats.patient_count, 0) AS patient_count,
                    COALESCE(appointment_stats.appointment_count, 0) AS appointment_count,
                    COALESCE(appointment_stats.upcoming_appointment_count, 0) AS upcoming_appointment_count,
                    COALESCE(invoice_stats.revenue_total, 0) AS revenue_total,
                    COALESCE(invoice_stats.revenue_collected, 0) AS revenue_collected,
                    COALESCE(invoice_stats.revenue_outstanding, 0) AS revenue_outstanding,
                    COALESCE(secretary_stats.secretary_count, 0) AS secretary_count,
                    COALESCE(review_stats.average_rating, 0) AS average_rating,
                    COALESCE(review_stats.review_count, 0) AS review_count
             FROM users u
             JOIN user_clinics uc ON uc.user_id = u.id
             LEFT JOIN LATERAL (
                 SELECT COUNT(DISTINCT a.patient_id) AS patient_count
                 FROM appointments a
                 WHERE a.clinic_id = uc.clinic_id AND a.practitioner_id = u.id
             ) patient_stats ON true
             LEFT JOIN LATERAL (
                 SELECT COUNT(*) AS appointment_count,
                        COUNT(*) FILTER (WHERE a.start_time >= CURRENT_TIMESTAMP) AS upcoming_appointment_count
                 FROM appointments a
                 WHERE a.clinic_id = uc.clinic_id AND a.practitioner_id = u.id
             ) appointment_stats ON true
             LEFT JOIN LATERAL (
                 SELECT SUM(i.total_amount) AS revenue_total,
                        SUM(i.paid_amount) AS revenue_collected,
                        SUM(i.total_amount - i.paid_amount) AS revenue_outstanding
                 FROM invoices i
                 WHERE i.clinic_id = uc.clinic_id AND i.practitioner_id = u.id
             ) invoice_stats ON true
             LEFT JOIN LATERAL (
                 SELECT COUNT(*) AS secretary_count
                 FROM users secretary
                 JOIN user_clinics secretary_clinic ON secretary_clinic.user_id = secretary.id
                 WHERE secretary_clinic.clinic_id = uc.clinic_id
                   AND secretary.role = 'secretary'
                   AND secretary.assigned_practitioner_id = u.id
             ) secretary_stats ON true
             LEFT JOIN LATERAL (
                 SELECT AVG(rating) AS average_rating, COUNT(*) AS review_count
                 FROM practitioner_reviews pr
                 WHERE pr.clinic_id = uc.clinic_id AND pr.practitioner_id = u.id
             ) review_stats ON true
             WHERE ${filters.join(' AND ')}
             ORDER BY u.is_active DESC, u.last_name, u.first_name`,
            params
        );

        res.json({ success: true, data: result.rows.map(buildPractitionerAdminPayload) });
    } catch (error) {
        console.error('Failed to fetch practitioner admin list:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch practitioners' });
    }
});

router.get('/practitioners/:id/admin-overview', authMiddleware, async (req, res) => {
    if (!requireClinicAdmin(req, res)) return;

    try {
        const practitionerResult = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.specialty,
                    u.license_number, u.avatar_url, u.is_active, u.created_at,
                    u.consultation_fee, u.accepts_online, u.payment_policy, u.bio,
                    u.calendar_preferences, uc.role AS clinic_role
             FROM users u
             JOIN user_clinics uc ON uc.user_id = u.id
             WHERE u.id = $1
               AND uc.clinic_id = $2
               AND u.role = 'practitioner'`,
            [req.params.id, req.user.clinicId]
        );

        if (practitionerResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Practitioner not found' });
        }

        const [patientsResult, appointmentsResult, invoicesResult, secretariesResult] = await Promise.all([
            db.query(
                `SELECT DISTINCT ON (p.id) p.id, p.patient_number, p.first_name, p.last_name,
                        p.email, p.phone, p.avatar_url, p.is_active, MAX(a.start_time) OVER (PARTITION BY p.id) AS last_visit
                 FROM patients p
                 JOIN appointments a ON a.patient_id = p.id
                 WHERE a.clinic_id = $1 AND a.practitioner_id = $2
                 ORDER BY p.id, a.start_time DESC
                 LIMIT 12`,
                [req.user.clinicId, req.params.id]
            ),
            db.query(
                `SELECT a.id, a.appointment_type, a.status, a.start_time, a.end_time,
                        p.first_name, p.last_name, p.avatar_url
                 FROM appointments a
                 LEFT JOIN patients p ON p.id = a.patient_id
                 WHERE a.clinic_id = $1 AND a.practitioner_id = $2
                 ORDER BY a.start_time DESC
                 LIMIT 12`,
                [req.user.clinicId, req.params.id]
            ),
            db.query(
                `SELECT status,
                        COUNT(*) AS count,
                        SUM(total_amount) AS total,
                        SUM(paid_amount) AS paid,
                        SUM(total_amount - paid_amount) AS balance
                 FROM invoices
                 WHERE clinic_id = $1 AND practitioner_id = $2
                 GROUP BY status`,
                [req.user.clinicId, req.params.id]
            ),
            db.query(
                `SELECT secretary.id, secretary.email, secretary.first_name, secretary.last_name,
                        secretary.phone, secretary.is_active, secretary.access_permissions,
                        secretary.assigned_practitioner_id, secretary.created_at, secretary.last_login
                 FROM users secretary
                 JOIN user_clinics uc ON uc.user_id = secretary.id
                 WHERE uc.clinic_id = $1
                   AND secretary.role = 'secretary'
                   AND secretary.assigned_practitioner_id = $2
                 ORDER BY secretary.created_at DESC`,
                [req.user.clinicId, req.params.id]
            )
        ]);

        const practitioner = practitionerResult.rows[0];

        res.json({
            success: true,
            data: {
                practitioner: {
                    ...buildPractitionerAdminPayload(practitioner),
                    calendar: normalizeCalendarPreferences(practitioner.calendar_preferences)
                },
                patients: patientsResult.rows.map((patient) => ({
                    id: patient.id,
                    patientNumber: patient.patient_number,
                    firstName: patient.first_name,
                    lastName: patient.last_name,
                    fullName: `${patient.first_name} ${patient.last_name}`,
                    email: patient.email,
                    phone: patient.phone,
                    avatarUrl: patient.avatar_url ? resolveStoredUploadUrl(patient.avatar_url) : null,
                    isActive: Boolean(patient.is_active),
                    lastVisit: patient.last_visit
                })),
                appointments: appointmentsResult.rows.map((appointment) => ({
                    id: appointment.id,
                    type: appointment.appointment_type,
                    status: appointment.status,
                    start: appointment.start_time,
                    end: appointment.end_time,
                    patientName: appointment.first_name ? `${appointment.first_name} ${appointment.last_name}` : null,
                    patientAvatarUrl: appointment.avatar_url ? resolveStoredUploadUrl(appointment.avatar_url) : null
                })),
                revenue: invoicesResult.rows.map((invoice) => ({
                    status: invoice.status,
                    count: Number(invoice.count || 0),
                    total: parseFloat(invoice.total || 0),
                    paid: parseFloat(invoice.paid || 0),
                    balance: parseFloat(invoice.balance || 0)
                })),
                secretaries: secretariesResult.rows.map(buildSecretaryPayload)
            }
        });
    } catch (error) {
        console.error('Failed to fetch practitioner overview:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch practitioner overview' });
    }
});

router.post('/practitioners', authMiddleware, [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required')
], async (req, res) => {
    if (!requireClinicAdmin(req, res)) return;

    const message = getValidationMessage(req);
    if (message) return res.status(400).json({ success: false, message });

    const {
        email,
        password,
        firstName,
        lastName,
        phone,
        specialty,
        licenseNumber,
        avatarUrl,
        consultationFee,
        acceptsOnline,
        paymentPolicy,
        bio,
        calendar,
        isActive
    } = req.body;
    const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userResult = await client.query(
            `INSERT INTO users (
                email, password_hash, first_name, last_name, phone, role, specialty,
                license_number, avatar_url, consultation_fee, accepts_online, payment_policy,
                bio, calendar_preferences, is_active, is_verified
             ) VALUES ($1,$2,$3,$4,$5,'practitioner',$6,$7,$8,$9,$10,$11,$12,$13,$14,true)
             RETURNING id, email, first_name, last_name, phone, role, specialty, license_number,
                       avatar_url, is_active, created_at, consultation_fee, accepts_online,
                       payment_policy, bio`,
            [
                email,
                passwordHash,
                firstName,
                lastName,
                phone || null,
                specialty || null,
                licenseNumber || null,
                normalizedAvatarUrl,
                Number(consultationFee || 0) || 50,
                typeof acceptsOnline === 'boolean' ? acceptsOnline : true,
                allowedPolicies.includes(paymentPolicy) ? paymentPolicy : 'full-onsite',
                bio || null,
                calendar ? JSON.stringify(normalizeCalendarPreferences(calendar)) : null,
                typeof isActive === 'boolean' ? isActive : true
            ]
        );

        await client.query(
            `INSERT INTO user_clinics (user_id, clinic_id, role)
             VALUES ($1, $2, 'practitioner')
             ON CONFLICT (user_id, clinic_id) DO UPDATE SET role = EXCLUDED.role`,
            [userResult.rows[0].id, req.user.clinicId]
        );

        await client.query('COMMIT');

        createClinicAdminNotification({
            clinicId: req.user.clinicId,
            type: 'success',
            title: 'Nouveau médecin ajouté',
            message: `Dr. ${firstName} ${lastName} a été ajouté à la clinique.`,
            url: '/admin/doctors',
            metadata: { userId: userResult.rows[0].id, event: 'practitioner_created' },
            excludeUserId: req.user.id
        }).catch((error) => console.error('Failed to notify clinic admins:', error));

        createPlatformAdminNotification({
            type: 'info',
            title: 'Nouveau médecin en clinique',
            message: `Dr. ${firstName} ${lastName} a été créé par une clinique.`,
            url: '/admin/doctors',
            metadata: { userId: userResult.rows[0].id, clinicId: req.user.clinicId, event: 'practitioner_created' }
        }).catch((error) => console.error('Failed to notify platform admins:', error));

        res.status(201).json({
            success: true,
            message: 'Practitioner created',
            data: buildPractitionerAdminPayload(userResult.rows[0])
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to create practitioner:', error);
        res.status(500).json({ success: false, message: 'Failed to create practitioner' });
    } finally {
        client.release();
    }
});

router.put('/practitioners/:id', authMiddleware, async (req, res) => {
    if (!requireClinicAdmin(req, res)) return;

    const {
        firstName,
        lastName,
        phone,
        specialty,
        licenseNumber,
        avatarUrl,
        consultationFee,
        acceptsOnline,
        paymentPolicy,
        bio,
        calendar,
        isActive,
        password
    } = req.body;
    const normalizedAvatarUrl = avatarUrl === '' ? null : normalizeAvatarUrl(avatarUrl);
    const params = [
        firstName || null,
        lastName || null,
        phone ?? null,
        specialty ?? null,
        licenseNumber ?? null,
        avatarUrl === undefined ? undefined : normalizedAvatarUrl,
        consultationFee === undefined ? undefined : Number(consultationFee || 0),
        typeof acceptsOnline === 'boolean' ? acceptsOnline : undefined,
        allowedPolicies.includes(paymentPolicy) ? paymentPolicy : undefined,
        bio ?? null,
        calendar === undefined ? undefined : JSON.stringify(normalizeCalendarPreferences(calendar)),
        typeof isActive === 'boolean' ? isActive : undefined,
        req.params.id,
        req.user.clinicId
    ];

    let passwordClause = '';
    if (password) {
        if (String(password).length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
        params.push(await bcrypt.hash(password, 10));
        passwordClause = `, password_hash = $${params.length}`;
    }

    try {
        const result = await db.query(
            `UPDATE users u
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 phone = COALESCE($3, phone),
                 specialty = COALESCE($4, specialty),
                 license_number = COALESCE($5, license_number),
                 avatar_url = CASE WHEN $6::text IS NULL THEN avatar_url ELSE $6 END,
                 consultation_fee = COALESCE($7, consultation_fee),
                 accepts_online = COALESCE($8, accepts_online),
                 payment_policy = COALESCE($9, payment_policy),
                 bio = COALESCE($10, bio),
                 calendar_preferences = COALESCE($11::jsonb, calendar_preferences),
                 is_active = COALESCE($12, is_active),
                 updated_at = CURRENT_TIMESTAMP
                 ${passwordClause}
             FROM user_clinics uc
             WHERE u.id = $13
               AND uc.user_id = u.id
               AND uc.clinic_id = $14
               AND u.role = 'practitioner'
             RETURNING u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.specialty,
                       u.license_number, u.avatar_url, u.is_active, u.created_at,
                       u.consultation_fee, u.accepts_online, u.payment_policy, u.bio, uc.role AS clinic_role`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Practitioner not found' });
        }

        res.json({
            success: true,
            message: 'Practitioner updated',
            data: buildPractitionerAdminPayload(result.rows[0])
        });
    } catch (error) {
        console.error('Failed to update practitioner:', error);
        res.status(500).json({ success: false, message: 'Failed to update practitioner' });
    }
});

router.delete('/practitioners/:id', authMiddleware, async (req, res) => {
    if (!requireClinicAdmin(req, res)) return;

    try {
        const result = await db.query(
            `UPDATE users u
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             FROM user_clinics uc
             WHERE u.id = $1
               AND uc.user_id = u.id
               AND uc.clinic_id = $2
               AND u.role = 'practitioner'
             RETURNING u.id`,
            [req.params.id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Practitioner not found' });
        }

        res.json({ success: true, message: 'Practitioner deactivated' });
    } catch (error) {
        console.error('Failed to deactivate practitioner:', error);
        res.status(500).json({ success: false, message: 'Failed to deactivate practitioner' });
    }
});

router.get('/practitioners', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.specialty
             FROM users u
             JOIN user_clinics uc ON u.id = uc.user_id
             WHERE uc.clinic_id = $1
               AND u.role = 'practitioner'
               AND u.is_active = true
             ORDER BY u.last_name, u.first_name`,
            [req.user.clinicId]
        );

        res.json({
            success: true,
            data: result.rows.map((entry) => ({
                id: entry.id,
                name: `Dr. ${entry.first_name} ${entry.last_name}`,
                specialty: entry.specialty
            }))
        });
    } catch (error) {
        console.error('Failed to fetch practitioners:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch practitioners' });
    }
});

module.exports = router;
