const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { cancelGoogleEvent } = require('../services/googleCalendar');
const { buildUploadUrl, detectDocumentType, ensureUploadDir, resolveStoredUploadUrl } = require('../utils/uploads');
const {
    getSessionLabel,
    minutesToTime,
    normalizeCalendarPreferences,
    timeToMinutes
} = require('../utils/calendarPreferences');
const { formatLocalDateTime } = require('../utils/dateTime');
const { saveSubscription } = require('../services/webPushNotifications');
const { createClinicRoleNotification, createNotification, createPlatformAdminNotification } = require('../services/notificationCenter');

const router = express.Router();

const patientUploadDir = ensureUploadDir('patient-documents');

const profileImageDir = ensureUploadDir('profile-images');

const patientDocumentStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, patientUploadDir),
    filename: (req, file, cb) => {
        const safeExt = path.extname(file.originalname || '').toLowerCase();
        cb(null, `${uuidv4()}${safeExt}`);
    }
});

const patientDocumentUpload = multer({
    storage: patientDocumentStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf',
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

const patientProfileImageUpload = multer({
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

const normalizeListField = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.filter(Boolean);
            }
        } catch (error) {
            // Fall back to comma-separated values.
        }

        return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return value;
};

const buildPatientNumber = async (clinicId, client = db) => {
    const countResult = await client.query(
        'SELECT COUNT(*)::int AS total FROM patients WHERE clinic_id = $1',
        [clinicId]
    );

    return `PAT-${String((countResult.rows[0]?.total || 0) + 1).padStart(5, '0')}`;
};

const ensurePatientClinicAssignment = async (patientId, clinicId, client = db) => {
    const patientResult = await client.query(
        'SELECT clinic_id, patient_number FROM patients WHERE id = $1',
        [patientId]
    );

    if (patientResult.rows.length === 0) {
        throw new Error('Patient not found');
    }

    const patient = patientResult.rows[0];
    if (patient.clinic_id) {
        return patient;
    }

    const patientNumber = await buildPatientNumber(clinicId, client);
    const updateResult = await client.query(
        `UPDATE patients
         SET clinic_id = $1,
             patient_number = COALESCE(patient_number, $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING clinic_id, patient_number`,
        [clinicId, patientNumber, patientId]
    );

    return updateResult.rows[0];
};

// Helper: verify patient token
const verifyPatientToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    try {
        const token = authHeader.split(' ')[1];
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch { return null; }
};

const buildMeetingPayload = (appointment) => {
    const isOnline = appointment.consultation_mode === 'online';
    const status = appointment.status || 'scheduled';
    const hasMeetLink = Boolean(appointment.meet_link);
    const canExposeMeeting = ['confirmed', 'in_progress', 'completed'].includes(status);

    return {
        provider: isOnline ? (appointment.meeting_provider || 'google_meet') : null,
        status: !isOnline
            ? 'not_required'
            : status === 'cancelled'
                ? 'cancelled'
                : status === 'scheduled'
                    ? 'awaiting_approval'
                : hasMeetLink
                    ? 'ready'
                    : (appointment.meeting_status || 'pending'),
        joinUrl: isOnline && canExposeMeeting ? appointment.meet_link : null,
        createdAt: appointment.meeting_created_at,
        lastSyncAt: appointment.meeting_last_sync_at
    };
};

const isModeAllowedBySession = (sessionMode, requestedMode) => (
    sessionMode === 'both' || sessionMode === requestedMode
);

const getModeAvailability = (sessions) => ({
    inPerson: sessions.some((session) => session.enabled && isModeAllowedBySession(session.mode, 'in-person')),
    online: sessions.some((session) => session.enabled && isModeAllowedBySession(session.mode, 'online'))
});

// ─── Patient Registration ────────────────────────────────────────────
router.post('/patient/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { email, password, firstName, lastName, phone, dateOfBirth, gender } = req.body;

        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) return res.status(409).json({ success: false, message: 'Email already registered' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const userResult = await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_verified)
                 VALUES ($1, $2, $3, $4, $5, 'patient', true) RETURNING id, email, first_name, last_name, role`,
                [email, passwordHash, firstName, lastName, phone]
            );
            const user = userResult.rows[0];

            const existingPatient = await client.query('SELECT id FROM patients WHERE email = $1', [email]);
            let patientId;
            if (existingPatient.rows.length > 0) {
                patientId = existingPatient.rows[0].id;
                await client.query('UPDATE patients SET user_id = $1 WHERE id = $2', [user.id, patientId]);
            } else {
                const patientResult = await client.query(
                    `INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, gender, user_id, referral_source)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'online') RETURNING id`,
                    [firstName, lastName, email, phone, dateOfBirth || null, gender || null, user.id]
                );
                patientId = patientResult.rows[0].id;
            }
            await client.query('COMMIT');

            createPlatformAdminNotification({
                type: 'info',
                title: 'Nouveau compte patient',
                message: `${firstName} ${lastName} a créé un compte patient.`,
                url: '/admin/accounts',
                metadata: { userId: user.id, patientId, event: 'patient_account_created' }
            }).catch((error) => console.error('Failed to notify platform admins:', error));

            const token = jwt.sign(
                { userId: user.id, email: user.email, role: 'patient', patientId },
                process.env.JWT_SECRET, { expiresIn: '7d' }
            );

            res.status(201).json({
                success: true,
                data: { user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: 'patient', patientId }, token }
            });
        } catch (err) { await client.query('ROLLBACK'); throw err; }
        finally { client.release(); }
    } catch (error) {
        console.error('Patient registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// ─── Patient Login ───────────────────────────────────────────────────
router.post('/patient/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
        const { email, password } = req.body;
        const result = await db.query(
            `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active,
                    p.id as patient_id, p.avatar_url
             FROM users u LEFT JOIN patients p ON p.user_id = u.id
             WHERE u.email = $1 AND u.role = 'patient'`, [email]
        );
        if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const user = result.rows[0];
        if (!user.is_active) return res.status(401).json({ success: false, message: 'Account deactivated' });
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: 'patient', patientId: user.patient_id },
            process.env.JWT_SECRET, { expiresIn: '7d' }
        );
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: 'patient',
                    patientId: user.patient_id,
                    avatarUrl: resolveStoredUploadUrl(user.avatar_url)
                },
                token
            }
        });
    } catch (error) {
        console.error('Patient login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// ─── Get Practitioners (public, filterable by specialty) ─────────────
router.get('/practitioners', async (req, res) => {
    try {
        const { specialty } = req.query;
        let query = `SELECT u.id, u.first_name, u.last_name, u.specialty, u.avatar_url, u.bio,
                            u.consultation_fee, u.accepts_online, u.payment_policy, u.calendar_preferences,
                            COALESCE(rs.average_rating, 0) AS average_rating,
                            COALESCE(rs.reviews_count, 0) AS reviews_count
                     FROM users u
                     LEFT JOIN (
                        SELECT practitioner_id,
                               ROUND(AVG(rating)::numeric, 1) AS average_rating,
                               COUNT(*)::int AS reviews_count
                        FROM practitioner_reviews
                        WHERE is_visible = true
                        GROUP BY practitioner_id
                     ) rs ON rs.practitioner_id = u.id
                     WHERE u.role = 'practitioner' AND u.is_active = true`;
        const params = [];
        if (specialty && specialty !== 'all') {
            params.push(`%${specialty}%`);
            query += ` AND LOWER(u.specialty) LIKE LOWER($${params.length})`;
        }
        query += ' ORDER BY u.last_name';
        const result = await db.query(query, params);
        res.json({
            success: true,
            data: result.rows.map(p => ({
                id: p.id,
                name: `Dr. ${p.first_name} ${p.last_name}`,
                firstName: p.first_name,
                lastName: p.last_name,
                specialty: p.specialty || 'General Practice',
                avatarUrl: resolveStoredUploadUrl(p.avatar_url),
                bio: p.bio || 'Experienced healthcare professional dedicated to patient care.',
                consultationFee: parseFloat(p.consultation_fee) || 50,
                acceptsOnline: Boolean(p.accepts_online),
                paymentPolicy: p.payment_policy || 'full-onsite',
                calendar: normalizeCalendarPreferences(p.calendar_preferences),
                ratingAvg: Number(parseFloat(p.average_rating || 0).toFixed(1)),
                reviewsCount: Number(p.reviews_count || 0)
            }))
        });
    } catch (error) {
        console.error('Error fetching practitioners:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch practitioners' });
    }
});

router.get('/practitioners/:id', async (req, res) => {
    try {
        const patient = verifyPatientToken(req);
        const practitionerResult = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.specialty, u.avatar_url, u.bio,
                    u.consultation_fee, u.accepts_online, u.payment_policy, u.calendar_preferences,
                    COALESCE(rs.average_rating, 0) AS average_rating,
                    COALESCE(rs.reviews_count, 0) AS reviews_count
             FROM users u
             LEFT JOIN (
                SELECT practitioner_id,
                       ROUND(AVG(rating)::numeric, 1) AS average_rating,
                       COUNT(*)::int AS reviews_count
                FROM practitioner_reviews
                WHERE is_visible = true
                GROUP BY practitioner_id
             ) rs ON rs.practitioner_id = u.id
             WHERE u.id = $1 AND u.role = 'practitioner' AND u.is_active = true`,
            [req.params.id]
        );

        if (practitionerResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Practitioner not found' });
        }

        const reviewsResult = await db.query(
            `SELECT pr.id, pr.rating, pr.review_text, pr.created_at,
                    p.first_name, p.last_name
             FROM practitioner_reviews pr
             JOIN patients p ON p.id = pr.patient_id
             WHERE pr.practitioner_id = $1 AND pr.is_visible = true
             ORDER BY pr.created_at DESC
             LIMIT 12`,
            [req.params.id]
        );

        let patientReview = null;
        let canReview = false;
        let lastCompletedAppointmentId = null;

        if (patient?.patientId) {
            const eligibilityResult = await db.query(
                `SELECT a.id AS appointment_id
                 FROM appointments a
                 WHERE a.patient_id = $1
                   AND a.practitioner_id = $2
                   AND a.status = 'completed'
                 ORDER BY a.end_time DESC
                 LIMIT 1`,
                [patient.patientId, req.params.id]
            );
            lastCompletedAppointmentId = eligibilityResult.rows[0]?.appointment_id || null;
            canReview = Boolean(lastCompletedAppointmentId);

            const patientReviewResult = await db.query(
                `SELECT id, rating, review_text, created_at, updated_at
                 FROM practitioner_reviews
                 WHERE practitioner_id = $1 AND patient_id = $2
                 LIMIT 1`,
                [req.params.id, patient.patientId]
            );

            if (patientReviewResult.rows.length > 0) {
                const row = patientReviewResult.rows[0];
                patientReview = {
                    id: row.id,
                    rating: Number(row.rating),
                    reviewText: row.review_text || '',
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
            }

            if (patientReview) {
                canReview = true;
            }
        }

        const row = practitionerResult.rows[0];
        res.json({
            success: true,
            data: {
                id: row.id,
                name: `Dr. ${row.first_name} ${row.last_name}`,
                firstName: row.first_name,
                lastName: row.last_name,
                specialty: row.specialty || 'General Practice',
                avatarUrl: resolveStoredUploadUrl(row.avatar_url),
                bio: row.bio || 'Experienced healthcare professional dedicated to patient care.',
                consultationFee: parseFloat(row.consultation_fee) || 50,
                acceptsOnline: Boolean(row.accepts_online),
                paymentPolicy: row.payment_policy || 'full-onsite',
                calendar: normalizeCalendarPreferences(row.calendar_preferences),
                ratingAvg: Number(parseFloat(row.average_rating || 0).toFixed(1)),
                reviewsCount: Number(row.reviews_count || 0),
                reviews: reviewsResult.rows.map((review) => ({
                    id: review.id,
                    rating: Number(review.rating),
                    reviewText: review.review_text || '',
                    createdAt: review.created_at,
                    patientName: `${review.first_name} ${review.last_name}`.trim()
                })),
                patientReview,
                canReview,
                lastCompletedAppointmentId
            }
        });
    } catch (error) {
        console.error('Error fetching practitioner profile:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch practitioner profile' });
    }
});

// ─── Get Specialties List (public) ───────────────────────────────────
router.get('/specialties', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT DISTINCT specialty FROM users WHERE role = 'practitioner' AND specialty IS NOT NULL AND specialty != '' ORDER BY specialty`
        );
        res.json({ success: true, data: result.rows.map(r => r.specialty) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch specialties' });
    }
});

router.get('/appointment-types', async (req, res) => {
    try {
        const { practitionerId } = req.query;

        let clinicId = req.query.clinicId || null;
        if (practitionerId) {
            const clinicResult = await db.query(
                'SELECT clinic_id FROM user_clinics WHERE user_id = $1 LIMIT 1',
                [practitionerId]
            );
            clinicId = clinicResult.rows[0]?.clinic_id || clinicId;
        }

        if (!clinicId) {
            return res.json({ success: true, data: [] });
        }

        const result = await db.query(
            `SELECT id, name, category, default_price, duration_minutes
             FROM services
             WHERE clinic_id = $1 AND is_active = true
             ORDER BY category, name`,
            [clinicId]
        );

        res.json({
            success: true,
            data: result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                category: row.category,
                price: parseFloat(row.default_price) || 0,
                durationMinutes: row.duration_minutes || 30
            }))
        });
    } catch (error) {
        console.error('Error fetching public appointment types:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch appointment types' });
    }
});

// ─── Get Available Time Slots ────────────────────────────────────────
router.get('/available-slots', async (req, res) => {
    try {
        const { practitionerId, date, consultationMode = 'in-person' } = req.query;
        if (!practitionerId || !date) return res.status(400).json({ success: false, message: 'practitionerId and date required' });

        const mode = consultationMode === 'online' ? 'online' : 'in-person';
        const practitionerResult = await db.query(
            `SELECT accepts_online, calendar_preferences
             FROM users
             WHERE id = $1 AND role = 'practitioner' AND is_active = true`,
            [practitionerId]
        );

        if (practitionerResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Practitioner not found' });
        }

        const practitioner = practitionerResult.rows[0];
        if (mode === 'online' && !practitioner.accepts_online) {
            return res.json({ success: true, data: [], meta: { reason: 'online_not_enabled' } });
        }

        const calendar = normalizeCalendarPreferences(practitioner.calendar_preferences);
        const durationMinutes = calendar.defaultDurationMinutes;
        const selectedDate = new Date(`${date}T00:00:00`);
        const now = new Date();
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + calendar.maxBookingDays);

        if (selectedDate > maxDate) {
            return res.json({ success: true, data: [], meta: { calendar, reason: 'outside_booking_window' } });
        }

        const dayOfWeek = selectedDate.getDay();
        const sessions = calendar.sessions.filter((session) =>
            session.enabled &&
            session.dayOfWeek === dayOfWeek &&
            isModeAllowedBySession(session.mode, mode)
        );

        const booked = await db.query(
            `SELECT start_time, end_time
             FROM appointments
             WHERE practitioner_id = $1
               AND DATE(start_time) = $2
               AND status NOT IN ('cancelled')`,
            [practitionerId, date]
        );

        const slots = [];

        sessions.forEach((session) => {
            const sessionStart = timeToMinutes(session.start);
            const sessionEnd = timeToMinutes(session.end);

            for (
                let totalMinutes = sessionStart;
                totalMinutes + durationMinutes <= sessionEnd;
                totalMinutes += calendar.slotStepMinutes
            ) {
                const slotTime = minutesToTime(totalMinutes);
                const slotStart = new Date(`${date}T${slotTime}:00`);
                const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

                const overlaps = booked.rows.some((entry) => {
                    const bookedStart = new Date(entry.start_time);
                    const bookedEnd = new Date(entry.end_time);
                    return slotStart < bookedEnd && slotEnd > bookedStart;
                });

                const tooSoon = slotStart.getTime() < now.getTime() + calendar.minNoticeHours * 60 * 60 * 1000;
                slots.push({
                    time: slotTime,
                    endTime: minutesToTime(totalMinutes + durationMinutes),
                    available: !overlaps && !tooSoon,
                    mode,
                    durationMinutes,
                    session: getSessionLabel(session),
                    sessionMode: session.mode
                });
            }
        });

        res.json({ success: true, data: slots, meta: { calendar, modeAvailability: getModeAvailability(calendar.sessions) } });
    } catch (error) {
        console.error('Error fetching slots:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch slots' });
    }
});

// ─── Book Appointment (requires patient token) ──────────────────────
router.post('/book-appointment', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in to book' });

        const {
            practitionerId, date, time, appointmentType, serviceId, notes, consultationMode,
            reasonCategory, reasonDetail
        } = req.body;
        if (!practitionerId || !date || !time) return res.status(400).json({ success: false, message: 'Missing required fields' });

        // Check conflicts
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Get practitioner info for pricing & policy
            const drResult = await client.query(
                'SELECT consultation_fee, payment_policy, accepts_online, calendar_preferences FROM users WHERE id = $1',
                [practitionerId]
            );
            const dr = drResult.rows[0];
            if (!dr) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Practitioner not found' });
            }

            const clinicResult = await client.query(
                'SELECT clinic_id FROM user_clinics WHERE user_id = $1 LIMIT 1',
                [practitionerId]
            );
            const clinicId = clinicResult.rows[0]?.clinic_id || null;
            if (!clinicId) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Practitioner is not linked to a clinic' });
            }

            const mode = consultationMode || 'in-person';
            const isOnline = mode === 'online';
            if (isOnline && !dr.accepts_online) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'This practitioner does not offer online consultations' });
            }

            let selectedService = null;
            if (serviceId) {
                const serviceResult = await client.query(
                    `SELECT id, name, default_price, duration_minutes
                     FROM services
                     WHERE id = $1 AND clinic_id = $2 AND is_active = true`,
                    [serviceId, clinicId]
                );
                selectedService = serviceResult.rows[0] || null;
            }

            const calendar = normalizeCalendarPreferences(dr.calendar_preferences);
            const durationMinutes = calendar.defaultDurationMinutes;
            const startTime = new Date(`${date}T${time}:00`);
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
            const bookingDate = new Date(`${date}T00:00:00`);
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + calendar.maxBookingDays);

            if (startTime.getTime() < Date.now() + calendar.minNoticeHours * 60 * 60 * 1000 || bookingDate > maxDate) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'This slot is outside the booking rules set by the doctor' });
            }

            const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
            const matchingSession = calendar.sessions.find((session) => (
                session.enabled &&
                session.dayOfWeek === bookingDate.getDay() &&
                isModeAllowedBySession(session.mode, mode) &&
                startMinutes >= timeToMinutes(session.start) &&
                startMinutes + durationMinutes <= timeToMinutes(session.end)
            ));

            if (!matchingSession) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'This consultation mode is not available for the selected session' });
            }

            const conflict = await client.query(
                `SELECT id
                 FROM appointments
                 WHERE practitioner_id = $1
                   AND status NOT IN ('cancelled')
                   AND tstzrange(start_time, end_time, '[)') && tstzrange($2::timestamp, $3::timestamp, '[)')`,
                [practitionerId, startTime, endTime]
            );
            if (conflict.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ success: false, message: 'Slot no longer available' });
            }

            await ensurePatientClinicAssignment(decoded.patientId, clinicId, client);

            const resolvedAppointmentType = selectedService?.name || appointmentType || 'Consultation';
            const fee = parseFloat(selectedService?.default_price ?? dr.consultation_fee) || 50;

            let paymentMode;
            let paymentStatus;
            let depositAmount;
            if (isOnline) {
                paymentMode = 'full-advance';
                paymentStatus = 'paid';
                depositAmount = fee;
            } else if (dr.payment_policy === 'deposit-30') {
                paymentMode = 'deposit-30';
                paymentStatus = 'deposit-paid';
                depositAmount = Math.round(fee * 0.3 * 100) / 100;
            } else {
                paymentMode = 'full-onsite';
                paymentStatus = 'pending';
                depositAmount = 0;
            }

            let meetLink = null;
            let googleEventId = null;
            let meetingProvider = null;
            let meetingStatus = isOnline ? 'awaiting_approval' : 'not_required';
            let meetingCreatedAt = null;
            let meetingLastSyncAt = null;
            if (isOnline) {
                meetingProvider = 'jitsi';
            }

            const result = await client.query(
                `INSERT INTO appointments (patient_id, practitioner_id, clinic_id, start_time, end_time,
                 appointment_type, status, notes, consultation_mode, reason_category, reason_detail, meet_link, google_event_id, payment_mode, payment_status,
                 deposit_amount, total_amount, meeting_provider, meeting_status, meeting_created_at, meeting_last_sync_at)
                 VALUES ($1,$2,$3,$4,$5,$6,'awaiting_approval',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
                 RETURNING id, start_time, end_time, status, consultation_mode, meet_link, google_event_id, payment_status, deposit_amount, total_amount,
                           reason_category, reason_detail, meeting_provider, meeting_status, meeting_created_at, meeting_last_sync_at`,
                [decoded.patientId, practitionerId, clinicId, startTime, endTime,
                    resolvedAppointmentType, notes || '', mode, reasonCategory || null, reasonDetail || null, meetLink, googleEventId,
                    paymentMode, paymentStatus, depositAmount, fee, meetingProvider, meetingStatus, meetingCreatedAt, meetingLastSyncAt]
            );

            await client.query('COMMIT');

            createNotification({
                clinicId,
                userId: practitionerId,
                type: 'appointment',
                title: 'Nouvelle demande de rendez-vous',
                message: `Demande ${resolvedAppointmentType} le ${date} à ${time}`,
                url: '/appointments',
                metadata: { appointmentId: result.rows[0].id }
            }).catch(() => {});
            createClinicRoleNotification({
                clinicId,
                targetRole: 'secretary',
                type: 'appointment',
                title: 'Nouvelle demande patient',
                message: `Un patient demande ${resolvedAppointmentType} le ${date} à ${time}`,
                url: '/appointments',
                metadata: { appointmentId: result.rows[0].id }
            }).catch(() => {});

            const bookedAppointment = result.rows[0];
            res.status(201).json({
                success: true,
                message: isOnline
                    ? 'Online appointment requested. The doctor must confirm it before the Jitsi Meet link appears in your portal.'
                    : paymentMode === 'deposit-30'
                        ? `Appointment booked! A deposit of €${depositAmount} has been charged. Remaining €${(fee - depositAmount).toFixed(2)} due on-site.`
                        : 'Appointment booked! Full payment due on-site.',
                data: {
                    ...bookedAppointment,
                    start_time: formatLocalDateTime(bookedAppointment.start_time),
                    end_time: formatLocalDateTime(bookedAppointment.end_time)
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Booking error:', error);
        if (error.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid session' });
        res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

router.post('/web-push/subscribe', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        await saveSubscription({
            patientId: decoded.patientId,
            role: 'patient',
            subscription: req.body.subscription
        });

        res.json({ success: true, message: 'Web push subscription saved' });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to save web push subscription'
        });
    }
});

router.get('/notifications', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const result = await db.query(
            `SELECT id, type, title, message, url, metadata, read_at, created_at
             FROM notifications
             WHERE patient_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [decoded.patientId]
        );

        res.json({
            success: true,
            data: result.rows.map((row) => ({
                id: row.id,
                type: row.type,
                title: row.title,
                message: row.message,
                url: row.url,
                metadata: row.metadata || {},
                readAt: row.read_at,
                createdAt: row.created_at,
                read: Boolean(row.read_at)
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});

router.patch('/notifications/:id/read', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const result = await db.query(
            `UPDATE notifications
             SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
             WHERE id = $1 AND patient_id = $2
             RETURNING id`,
            [req.params.id, decoded.patientId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
});

// ─── Cancel Appointment (patient) ────────────────────────────────────
router.post('/cancel-appointment/:id', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const apt = await db.query(
            'SELECT * FROM appointments WHERE id = $1 AND patient_id = $2', [req.params.id, decoded.patientId]
        );
        if (apt.rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });

        const appointment = apt.rows[0];
        const wasOnline = appointment.consultation_mode === 'online';
        const refunded = wasOnline && appointment.payment_status === 'paid';

        if (appointment.google_event_id) {
            try {
                await cancelGoogleEvent({
                    practitionerId: appointment.practitioner_id,
                    googleEventId: appointment.google_event_id
                });
            } catch (error) {
                console.error('Failed to cancel linked Google event for patient cancellation', {
                    appointmentId: appointment.id,
                    googleEventId: appointment.google_event_id,
                    message: error.message
                });
            }
        }

        await db.query(
            `UPDATE appointments SET status = 'cancelled', cancellation_reason = $1, refunded = $2, payment_status = $3
             , meeting_status = 'cancelled', meeting_last_sync_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [req.body.reason || 'Cancelled by patient', refunded, refunded ? 'refunded' : 'cancelled', req.params.id]
        );

        res.json({
            success: true,
            message: refunded
                ? 'Appointment cancelled. Your payment will be refunded.'
                : 'Appointment cancelled successfully.'
        });
    } catch (error) {
        console.error('Cancel error:', error);
        res.status(500).json({ success: false, message: 'Cancellation failed' });
    }
});

// ─── Get Patient's Appointments ──────────────────────────────────────
router.get('/my-appointments', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const result = await db.query(
            `SELECT a.id, a.start_time, a.end_time, a.appointment_type, a.status, a.notes,
                    a.consultation_mode, a.meet_link, a.payment_mode, a.payment_status,
                    a.deposit_amount, a.total_amount, a.refunded,
                    a.reason_category, a.reason_detail, a.preparation_notes, a.requested_documents,
                    a.meeting_provider, a.meeting_status, a.meeting_created_at, a.meeting_last_sync_at,
                    u.first_name as dr_first, u.last_name as dr_last, u.specialty
             FROM appointments a LEFT JOIN users u ON a.practitioner_id = u.id
             WHERE a.patient_id = $1 ORDER BY a.start_time DESC`, [decoded.patientId]
        );
        res.json({
            success: true,
            data: result.rows.map((a) => {
                const meeting = buildMeetingPayload(a);
                return {
                    id: a.id, startTime: formatLocalDateTime(a.start_time), endTime: formatLocalDateTime(a.end_time),
                    type: a.appointment_type, status: a.status, notes: a.notes,
                    reasonCategory: a.reason_category, reasonDetail: a.reason_detail,
                    preparationNotes: a.preparation_notes,
                    requestedDocuments: a.requested_documents || [],
                    consultationMode: a.consultation_mode, meetLink: meeting.joinUrl,
                    paymentMode: a.payment_mode, paymentStatus: a.payment_status,
                    depositAmount: a.deposit_amount, totalAmount: a.total_amount, refunded: a.refunded,
                    practitioner: `Dr. ${a.dr_first} ${a.dr_last}`, specialty: a.specialty,
                    meeting
                };
            })
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
});

// ─── Patient Profile ─────────────────────────────────────────────────
router.get('/my-profile', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const patient = await db.query('SELECT * FROM patients WHERE id = $1', [decoded.patientId]);
        if (patient.rows.length === 0) return res.status(404).json({ success: false, message: 'Profile not found' });

        const docs = await db.query(
            'SELECT * FROM patient_documents WHERE patient_id = $1 ORDER BY created_at DESC', [decoded.patientId]
        );
        const notes = await db.query(
            `SELECT an.*, a.start_time, a.appointment_type,
                    u.first_name as dr_first, u.last_name as dr_last
             FROM appointment_notes an
             LEFT JOIN appointments a ON an.appointment_id = a.id
             LEFT JOIN users u ON a.practitioner_id = u.id
             WHERE an.patient_id = $1 ORDER BY an.created_at DESC`, [decoded.patientId]
        );

        const p = patient.rows[0];
        res.json({
            success: true,
            data: {
                id: p.id, firstName: p.first_name, lastName: p.last_name, email: p.email,
                phone: p.phone, dateOfBirth: p.date_of_birth, gender: p.gender,
                avatarUrl: resolveStoredUploadUrl(p.avatar_url),
                address: p.address, city: p.city, bloodType: p.blood_type,
                allergies: p.allergies || [], chronicConditions: p.chronic_conditions || [],
                currentMedications: p.current_medications || [], notes: p.notes,
                documents: docs.rows.map((doc) => ({
                    ...doc,
                    file_type: doc.file_type || detectDocumentType({ mimeType: doc.mime_type, filename: doc.file_path }),
                    file_url: doc.file_path
                        ? resolveStoredUploadUrl(buildUploadUrl('patient-documents', path.basename(doc.file_path))) || null
                        : null
                })),
                appointmentNotes: notes.rows
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});

// ─── Update Patient Profile ──────────────────────────────────────────
router.put('/my-profile', patientProfileImageUpload.single('avatar'), async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const { phone, address, city, bloodType } = req.body;
        const allergies = normalizeListField(req.body.allergies);
        const chronicConditions = normalizeListField(req.body.chronicConditions);
        const currentMedications = normalizeListField(req.body.currentMedications);
        const avatarUrl = getUploadedAvatarUrl(req.file) || normalizeAvatarUrl(req.body.avatarUrl);
        const result = await db.query(
            `UPDATE patients SET phone=COALESCE($1,phone), address=COALESCE($2,address),
             city=COALESCE($3,city), blood_type=COALESCE($4,blood_type),
             allergies=COALESCE($5,allergies), chronic_conditions=COALESCE($6,chronic_conditions),
             current_medications=COALESCE($7,current_medications), avatar_url=COALESCE($8,avatar_url),
             updated_at=CURRENT_TIMESTAMP
             WHERE id=$9
             RETURNING avatar_url`,
            [phone, address, city, bloodType, allergies, chronicConditions, currentMedications, avatarUrl, decoded.patientId]
        );
        res.json({
            success: true,
            message: 'Profile updated',
            data: { avatarUrl: resolveStoredUploadUrl(result.rows[0]?.avatar_url || avatarUrl || '') }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});

// ─── Add Appointment Note ────────────────────────────────────────────
router.post('/appointment-notes', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const { appointmentId, content } = req.body;
        if (!appointmentId || !content) return res.status(400).json({ success: false, message: 'Missing fields' });

        // Verify appointment belongs to patient
        const apt = await db.query('SELECT id FROM appointments WHERE id=$1 AND patient_id=$2', [appointmentId, decoded.patientId]);
        if (apt.rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });

        const result = await db.query(
            `INSERT INTO appointment_notes (appointment_id, patient_id, content, created_by)
             VALUES ($1, $2, $3, 'patient') RETURNING *`,
            [appointmentId, decoded.patientId, content]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to add note' });
    }
});

router.post('/practitioners/:id/reviews', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const rating = Number(req.body.rating);
        const reviewText = String(req.body.reviewText || '').trim();

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        const eligibilityResult = await db.query(
            `SELECT a.id, a.clinic_id
             FROM appointments a
             WHERE a.patient_id = $1
               AND a.practitioner_id = $2
               AND a.status = 'completed'
             ORDER BY a.end_time DESC
             LIMIT 1`,
            [decoded.patientId, req.params.id]
        );

        if (eligibilityResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Complete an appointment with this doctor before leaving a review' });
        }

        const appointment = eligibilityResult.rows[0];

        const result = await db.query(
            `INSERT INTO practitioner_reviews (clinic_id, appointment_id, practitioner_id, patient_id, rating, review_text, is_visible)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             ON CONFLICT (practitioner_id, patient_id)
             DO UPDATE SET
                appointment_id = EXCLUDED.appointment_id,
                rating = EXCLUDED.rating,
                review_text = EXCLUDED.review_text,
                is_visible = true,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [appointment.clinic_id, appointment.id, req.params.id, decoded.patientId, rating, reviewText || null]
        );

        const row = result.rows[0];
        res.json({
            success: true,
            message: 'Review saved successfully',
            data: {
                id: row.id,
                rating: Number(row.rating),
                reviewText: row.review_text || '',
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }
        });
    } catch (error) {
        console.error('Failed to save review:', error);
        res.status(500).json({ success: false, message: 'Failed to save review' });
    }
});

// ─── Upload Patient Document ─────────────────────────────────────────
router.post('/documents', patientDocumentUpload.single('file'), async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const { name, fileType, category, notes, appointmentId, documentCode, accessScope } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Document name is required' });
        }

        const parsedAppointmentId = appointmentId || null;
        if (parsedAppointmentId) {
            const appointmentResult = await db.query(
                'SELECT id FROM appointments WHERE id = $1 AND patient_id = $2',
                [parsedAppointmentId, decoded.patientId]
            );

            if (appointmentResult.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Appointment access denied for this document' });
            }
        }

        const scope = ['appointment', 'shared'].includes(accessScope) ? accessScope : 'private';
        const result = await db.query(
            `INSERT INTO patient_documents
             (patient_id, name, document_code, file_type, category, notes, appointment_id, appointment_access_id, access_scope, uploaded_by, file_path, mime_type, file_size)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [
                decoded.patientId,
                name.trim(),
                documentCode || null,
                req.file
                    ? detectDocumentType({ mimeType: req.file.mimetype, filename: req.file.originalname })
                    : (fileType || 'document'),
                category || 'general',
                notes || null,
                parsedAppointmentId,
                scope === 'appointment' ? parsedAppointmentId : null,
                scope,
                decoded.userId,
                req.file?.path || null,
                req.file?.mimetype || null,
                req.file?.size || null
            ]
        );

        const savedDoc = result.rows[0];
        res.status(201).json({
            success: true,
            data: {
                ...savedDoc,
                file_type: savedDoc.file_type || detectDocumentType({ mimeType: savedDoc.mime_type, filename: savedDoc.file_path }),
                file_url: savedDoc.file_path
                    ? resolveStoredUploadUrl(buildUploadUrl('patient-documents', path.basename(savedDoc.file_path))) || null
                    : null
            }
        });
    } catch (error) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

router.put('/documents/:id', patientDocumentUpload.single('file'), async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const existingResult = await db.query(
            'SELECT * FROM patient_documents WHERE id = $1 AND patient_id = $2',
            [req.params.id, decoded.patientId]
        );

        if (existingResult.rows.length === 0) {
            if (req.file?.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const existing = existingResult.rows[0];
        const nextName = String(req.body.name || existing.name || '').trim();
        if (!nextName) {
            if (req.file?.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ success: false, message: 'Document name is required' });
        }

        const nextFilePath = req.file?.path || existing.file_path || null;
        const nextMimeType = req.file?.mimetype || existing.mime_type || null;
        const nextFileSize = req.file?.size || existing.file_size || null;
        const nextFileType = req.file
            ? detectDocumentType({ mimeType: req.file.mimetype, filename: req.file.originalname })
            : (existing.file_type || detectDocumentType({ mimeType: existing.mime_type, filename: existing.file_path }));
        const nextAppointmentId = req.body.appointmentId || existing.appointment_id || null;
        const nextAccessScope = ['private', 'appointment', 'shared'].includes(req.body.accessScope)
            ? req.body.accessScope
            : (existing.access_scope || 'private');

        if (nextAppointmentId) {
            const appointmentResult = await db.query(
                'SELECT id FROM appointments WHERE id = $1 AND patient_id = $2',
                [nextAppointmentId, decoded.patientId]
            );

            if (appointmentResult.rows.length === 0) {
                if (req.file?.path && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(403).json({ success: false, message: 'Appointment access denied for this document' });
            }
        }

        const result = await db.query(
            `UPDATE patient_documents
             SET name = $1,
                 document_code = $2,
                 file_type = $3,
                 category = $4,
                 notes = $5,
                 appointment_id = $6,
                 appointment_access_id = $7,
                 access_scope = $8,
                 file_path = $9,
                 mime_type = $10,
                 file_size = $11,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $12 AND patient_id = $13
             RETURNING *`,
            [
                nextName,
                req.body.documentCode || existing.document_code || null,
                nextFileType,
                req.body.category || existing.category || 'general',
                req.body.notes || null,
                nextAppointmentId,
                nextAccessScope === 'appointment' ? nextAppointmentId : null,
                nextAccessScope,
                nextFilePath,
                nextMimeType,
                nextFileSize,
                req.params.id,
                decoded.patientId
            ]
        );

        if (req.file?.path && existing.file_path && existing.file_path !== req.file.path && fs.existsSync(existing.file_path)) {
            fs.unlinkSync(existing.file_path);
        }

        const updatedDoc = result.rows[0];
        res.json({
            success: true,
            message: 'Document updated successfully',
            data: {
                ...updatedDoc,
                file_type: updatedDoc.file_type || detectDocumentType({ mimeType: updatedDoc.mime_type, filename: updatedDoc.file_path }),
                file_url: updatedDoc.file_path
                    ? resolveStoredUploadUrl(buildUploadUrl('patient-documents', path.basename(updatedDoc.file_path))) || null
                    : null
            }
        });
    } catch (error) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});

router.delete('/documents/:id', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const result = await db.query(
            'DELETE FROM patient_documents WHERE id = $1 AND patient_id = $2 RETURNING id, file_path',
            [req.params.id, decoded.patientId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const filePath = result.rows[0].file_path;
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
});

module.exports = router;
