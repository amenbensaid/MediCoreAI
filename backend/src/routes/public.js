const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// ─── Patient Registration ────────────────────────────────────────────
router.post('/patient/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password, firstName, lastName, phone, dateOfBirth, gender } = req.body;

        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        // Check if a patient record exists with this email
        const existingPatient = await db.query('SELECT id FROM patients WHERE email = $1', [email]);

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Create user with role 'patient'
            const userResult = await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_verified)
                 VALUES ($1, $2, $3, $4, $5, 'patient', true)
                 RETURNING id, email, first_name, last_name, role`,
                [email, passwordHash, firstName, lastName, phone]
            );
            const user = userResult.rows[0];

            // Create or link patient record
            let patientId;
            if (existingPatient.rows.length > 0) {
                patientId = existingPatient.rows[0].id;
                await client.query(
                    `UPDATE patients SET user_id = $1 WHERE id = $2`,
                    [user.id, patientId]
                );
            } else {
                const patientResult = await client.query(
                    `INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, gender, user_id, source)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'online')
                     RETURNING id`,
                    [firstName, lastName, email, phone, dateOfBirth || null, gender || null, user.id]
                );
                patientId = patientResult.rows[0].id;
            }

            await client.query('COMMIT');

            const token = jwt.sign(
                { userId: user.id, email: user.email, role: 'patient', patientId },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
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
                        role: 'patient',
                        patientId
                    },
                    token
                }
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
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
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        const result = await db.query(
            `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active,
                    p.id as patient_id
             FROM users u
             LEFT JOIN patients p ON p.user_id = u.id
             WHERE u.email = $1 AND u.role = 'patient'`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(401).json({ success: false, message: 'Account is deactivated' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: 'patient', patientId: user.patient_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
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
                    patientId: user.patient_id
                },
                token
            }
        });
    } catch (error) {
        console.error('Patient login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// ─── Get Available Practitioners (public) ────────────────────────────
router.get('/practitioners', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.specialty, u.avatar_url
             FROM users u
             WHERE u.role = 'practitioner' AND u.is_active = true
             ORDER BY u.last_name`
        );

        res.json({
            success: true,
            data: result.rows.map(p => ({
                id: p.id,
                name: `Dr. ${p.first_name} ${p.last_name}`,
                specialty: p.specialty || 'General',
                avatarUrl: p.avatar_url
            }))
        });
    } catch (error) {
        console.error('Error fetching practitioners:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch practitioners' });
    }
});

// ─── Get Available Time Slots (public) ───────────────────────────────
router.get('/available-slots', async (req, res) => {
    try {
        const { practitionerId, date } = req.query;
        if (!practitionerId || !date) {
            return res.status(400).json({ success: false, message: 'practitionerId and date are required' });
        }

        // Get booked slots for that day
        const booked = await db.query(
            `SELECT start_time, end_time FROM appointments
             WHERE practitioner_id = $1
             AND DATE(start_time) = $2
             AND status NOT IN ('cancelled')`,
            [practitionerId, date]
        );

        const bookedTimes = booked.rows.map(r => ({
            start: new Date(r.start_time).getHours() + ':' + String(new Date(r.start_time).getMinutes()).padStart(2, '0'),
        }));

        // Generate slots from 9:00 to 17:00 (30 min each)
        const slots = [];
        for (let h = 9; h < 17; h++) {
            for (let m = 0; m < 60; m += 30) {
                const time = `${h}:${String(m).padStart(2, '0')}`;
                const isBooked = bookedTimes.some(b => b.start === time);
                slots.push({
                    time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
                    available: !isBooked
                });
            }
        }

        res.json({ success: true, data: slots });
    } catch (error) {
        console.error('Error fetching slots:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch available slots' });
    }
});

// ─── Book Appointment (public – requires patient token) ──────────────
router.post('/book-appointment', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'Please log in to book an appointment' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.patientId) {
            return res.status(403).json({ success: false, message: 'Only patients can book appointments' });
        }

        const { practitionerId, date, time, appointmentType, notes } = req.body;
        if (!practitionerId || !date || !time) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const startTime = new Date(`${date}T${time}:00`);
        const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min

        // Check for conflicts
        const conflict = await db.query(
            `SELECT id FROM appointments
             WHERE practitioner_id = $1
             AND start_time = $2
             AND status NOT IN ('cancelled')`,
            [practitionerId, startTime]
        );

        if (conflict.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'This time slot is no longer available' });
        }

        // Get clinic_id from practitioner
        const clinicResult = await db.query(
            `SELECT clinic_id FROM user_clinics WHERE user_id = $1 LIMIT 1`,
            [practitionerId]
        );
        const clinicId = clinicResult.rows[0]?.clinic_id || null;

        const result = await db.query(
            `INSERT INTO appointments (patient_id, practitioner_id, clinic_id, start_time, end_time, appointment_type, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
             RETURNING id, start_time, end_time, status`,
            [decoded.patientId, practitionerId, clinicId, startTime, endTime, appointmentType || 'Consultation', notes || '']
        );

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Booking error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid session. Please log in again.' });
        }
        res.status(500).json({ success: false, message: 'Failed to book appointment' });
    }
});

// ─── Get Patient's Own Appointments ──────────────────────────────────
router.get('/my-appointments', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'Please log in' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.patientId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const result = await db.query(
            `SELECT a.id, a.start_time, a.end_time, a.appointment_type, a.status, a.notes,
                    u.first_name as dr_first, u.last_name as dr_last, u.specialty
             FROM appointments a
             LEFT JOIN users u ON a.practitioner_id = u.id
             WHERE a.patient_id = $1
             ORDER BY a.start_time DESC`,
            [decoded.patientId]
        );

        res.json({
            success: true,
            data: result.rows.map(a => ({
                id: a.id,
                startTime: a.start_time,
                endTime: a.end_time,
                type: a.appointment_type,
                status: a.status,
                notes: a.notes,
                practitioner: `Dr. ${a.dr_first} ${a.dr_last}`,
                specialty: a.specialty
            }))
        });
    } catch (error) {
        console.error('Error fetching patient appointments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
});

module.exports = router;
