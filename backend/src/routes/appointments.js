const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, patientId, status, page = 1, limit = 50 } = req.query;
        const clinicId = req.user.clinicId;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE a.clinic_id = $1';
        const params = [clinicId];
        let paramIndex = 2;

        if (startDate) {
            whereClause += ` AND a.start_time >= $${paramIndex++}`;
            params.push(startDate);
        }
        if (endDate) {
            whereClause += ` AND a.start_time <= $${paramIndex++}`;
            params.push(endDate);
        }
        if (patientId) {
            whereClause += ` AND a.patient_id = $${paramIndex++}`;
            params.push(patientId);
        }
        if (status) {
            whereClause += ` AND a.status = $${paramIndex++}`;
            params.push(status);
        }

        const result = await db.query(
            `SELECT a.*, p.first_name, p.last_name, p.phone, p.email,
              u.first_name as dr_first, u.last_name as dr_last
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.practitioner_id = u.id
       ${whereClause}
       ORDER BY a.start_time ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({ success: true, data: { appointments: result.rows } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
});

router.get('/calendar', authMiddleware, async (req, res) => {
    try {
        const { start, end } = req.query;
        const clinicId = req.user.clinicId;

        const result = await db.query(
            `SELECT a.id, a.title, a.appointment_type, a.start_time, a.end_time,
              a.status, a.room, a.color, p.first_name, p.last_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       WHERE a.clinic_id = $1 AND a.start_time >= $2 AND a.start_time <= $3
       ORDER BY a.start_time ASC`,
            [clinicId, start, end]
        );

        res.json({
            success: true,
            data: result.rows.map(a => ({
                id: a.id,
                title: a.title || `${a.first_name} ${a.last_name}`,
                start: a.start_time,
                end: a.end_time,
                status: a.status,
                color: a.color || '#3B82F6'
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch calendar' });
    }
});

router.post('/', authMiddleware, [
    body('patientId').isUUID(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
    body('appointmentType').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { patientId, practitionerId, appointmentType, title, description,
            startTime, endTime, durationMinutes, room, color, notes } = req.body;

        const result = await db.query(
            `INSERT INTO appointments (clinic_id, patient_id, practitioner_id, appointment_type,
        title, description, start_time, end_time, duration_minutes, room, color, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [req.user.clinicId, patientId, practitionerId || req.user.id, appointmentType,
                title, description, startTime, endTime, durationMinutes || 30, room, color, notes]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create appointment' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { patientId, appointmentType, title, startTime, endTime, status, room, notes } = req.body;

        const result = await db.query(
            `UPDATE appointments SET
        patient_id = COALESCE($1, patient_id),
        appointment_type = COALESCE($2, appointment_type),
        title = COALESCE($3, title),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        status = COALESCE($6, status),
        room = COALESCE($7, room),
        notes = COALESCE($8, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND clinic_id = $10
       RETURNING *`,
            [patientId, appointmentType, title, startTime, endTime, status, room, notes, id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update appointment' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM appointments WHERE id = $1 AND clinic_id = $2 RETURNING id',
            [req.params.id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete appointment' });
    }
});

router.get('/summary/today', authMiddleware, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const result = await db.query(
            `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM appointments
       WHERE clinic_id = $1 AND DATE(start_time) = $2`,
            [req.user.clinicId, today]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch summary' });
    }
});

module.exports = router;
