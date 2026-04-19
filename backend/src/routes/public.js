const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

// Helper: verify patient token
const verifyPatientToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    try {
        const token = authHeader.split(' ')[1];
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch { return null; }
};

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
            `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active, p.id as patient_id
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
            data: { user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: 'patient', patientId: user.patient_id }, token }
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
                            u.consultation_fee, u.accepts_online, u.payment_policy
                     FROM users u WHERE u.role = 'practitioner' AND u.is_active = true`;
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
                avatarUrl: p.avatar_url,
                bio: p.bio || 'Experienced healthcare professional dedicated to patient care.',
                consultationFee: parseFloat(p.consultation_fee) || 50,
                acceptsOnline: p.accepts_online,
                paymentPolicy: p.payment_policy || 'full-onsite'
            }))
        });
    } catch (error) {
        console.error('Error fetching practitioners:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch practitioners' });
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

// ─── Get Available Time Slots ────────────────────────────────────────
router.get('/available-slots', async (req, res) => {
    try {
        const { practitionerId, date } = req.query;
        if (!practitionerId || !date) return res.status(400).json({ success: false, message: 'practitionerId and date required' });
        const booked = await db.query(
            `SELECT start_time FROM appointments WHERE practitioner_id = $1 AND DATE(start_time) = $2 AND status NOT IN ('cancelled')`,
            [practitionerId, date]
        );
        const bookedHours = booked.rows.map(r => {
            const d = new Date(r.start_time);
            return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        });
        const slots = [];
        for (let h = 9; h < 17; h++) {
            for (let m = 0; m < 60; m += 30) {
                const time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                slots.push({ time, available: !bookedHours.includes(time) });
            }
        }
        res.json({ success: true, data: slots });
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

        const { practitionerId, date, time, appointmentType, notes, consultationMode } = req.body;
        if (!practitionerId || !date || !time) return res.status(400).json({ success: false, message: 'Missing required fields' });

        const startTime = new Date(`${date}T${time}:00`);
        const endTime = new Date(startTime.getTime() + 30 * 60000);

        // Check conflicts
        const conflict = await db.query(
            'SELECT id FROM appointments WHERE practitioner_id = $1 AND start_time = $2 AND status NOT IN (\'cancelled\')',
            [practitionerId, startTime]
        );
        if (conflict.rows.length > 0) return res.status(409).json({ success: false, message: 'Slot no longer available' });

        // Get practitioner info for pricing & policy
        const drResult = await db.query(
            'SELECT consultation_fee, payment_policy, accepts_online FROM users WHERE id = $1', [practitionerId]
        );
        const dr = drResult.rows[0];
        const fee = parseFloat(dr?.consultation_fee) || 50;
        const mode = consultationMode || 'in-person';
        const isOnline = mode === 'online';

        // Payment logic
        let paymentMode, paymentStatus, depositAmount;
        if (isOnline) {
            paymentMode = 'full-advance';
            paymentStatus = 'paid'; // simulate instant payment
            depositAmount = fee;
        } else if (dr?.payment_policy === 'deposit-30') {
            paymentMode = 'deposit-30';
            paymentStatus = 'deposit-paid';
            depositAmount = Math.round(fee * 0.3 * 100) / 100;
        } else {
            paymentMode = 'full-onsite';
            paymentStatus = 'pending';
            depositAmount = 0;
        }

        // Generate meet link for online appointments
        const meetLink = isOnline ? `https://meet.google.com/medicore-${uuidv4().slice(0,8)}` : null;

        // Get clinic
        const clinicResult = await db.query('SELECT clinic_id FROM user_clinics WHERE user_id = $1 LIMIT 1', [practitionerId]);
        const clinicId = clinicResult.rows[0]?.clinic_id || null;

        const result = await db.query(
            `INSERT INTO appointments (patient_id, practitioner_id, clinic_id, start_time, end_time,
             appointment_type, status, notes, consultation_mode, meet_link, payment_mode, payment_status,
             deposit_amount, total_amount)
             VALUES ($1,$2,$3,$4,$5,$6,'scheduled',$7,$8,$9,$10,$11,$12,$13)
             RETURNING id, start_time, end_time, status, consultation_mode, meet_link, payment_status, deposit_amount, total_amount`,
            [decoded.patientId, practitionerId, clinicId, startTime, endTime,
             appointmentType || 'Consultation', notes || '', mode, meetLink,
             paymentMode, paymentStatus, depositAmount, fee]
        );

        res.status(201).json({
            success: true,
            message: isOnline
                ? 'Online appointment booked! Check your email for the Google Meet link.'
                : paymentMode === 'deposit-30'
                    ? `Appointment booked! A deposit of €${depositAmount} has been charged. Remaining €${(fee - depositAmount).toFixed(2)} due on-site.`
                    : 'Appointment booked! Full payment due on-site.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Booking error:', error);
        if (error.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid session' });
        res.status(500).json({ success: false, message: 'Booking failed' });
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

        await db.query(
            `UPDATE appointments SET status = 'cancelled', cancellation_reason = $1, refunded = $2, payment_status = $3
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
                    u.first_name as dr_first, u.last_name as dr_last, u.specialty
             FROM appointments a LEFT JOIN users u ON a.practitioner_id = u.id
             WHERE a.patient_id = $1 ORDER BY a.start_time DESC`, [decoded.patientId]
        );
        res.json({
            success: true,
            data: result.rows.map(a => ({
                id: a.id, startTime: a.start_time, endTime: a.end_time,
                type: a.appointment_type, status: a.status, notes: a.notes,
                consultationMode: a.consultation_mode, meetLink: a.meet_link,
                paymentMode: a.payment_mode, paymentStatus: a.payment_status,
                depositAmount: a.deposit_amount, totalAmount: a.total_amount, refunded: a.refunded,
                practitioner: `Dr. ${a.dr_first} ${a.dr_last}`, specialty: a.specialty
            }))
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
                address: p.address, city: p.city, bloodType: p.blood_type,
                allergies: p.allergies || [], chronicConditions: p.chronic_conditions || [],
                currentMedications: p.current_medications || [], notes: p.notes,
                documents: docs.rows, appointmentNotes: notes.rows
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});

// ─── Update Patient Profile ──────────────────────────────────────────
router.put('/my-profile', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const { phone, address, city, bloodType, allergies, chronicConditions, currentMedications } = req.body;
        await db.query(
            `UPDATE patients SET phone=COALESCE($1,phone), address=COALESCE($2,address),
             city=COALESCE($3,city), blood_type=COALESCE($4,blood_type),
             allergies=COALESCE($5,allergies), chronic_conditions=COALESCE($6,chronic_conditions),
             current_medications=COALESCE($7,current_medications), updated_at=CURRENT_TIMESTAMP
             WHERE id=$8`,
            [phone, address, city, bloodType, allergies, chronicConditions, currentMedications, decoded.patientId]
        );
        res.json({ success: true, message: 'Profile updated' });
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

// ─── Upload Document (metadata only — file upload handled separately) 
router.post('/documents', async (req, res) => {
    try {
        const decoded = verifyPatientToken(req);
        if (!decoded?.patientId) return res.status(401).json({ success: false, message: 'Please log in' });

        const { name, fileType, category, notes, appointmentId } = req.body;
        const result = await db.query(
            `INSERT INTO patient_documents (patient_id, name, file_type, category, notes, appointment_id, uploaded_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [decoded.patientId, name, fileType || 'pdf', category || 'general', notes, appointmentId, decoded.userId]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

module.exports = router;
