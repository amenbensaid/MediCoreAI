const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/patient/:patientId', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.first_name, u.last_name
       FROM communications c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.patient_id = $1 AND c.clinic_id = $2
       ORDER BY c.created_at DESC`,
            [req.params.patientId, req.user.clinicId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch communications' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { patientId, type, direction, subject, content } = req.body;

        const result = await db.query(
            `INSERT INTO communications (clinic_id, patient_id, user_id, type, direction, subject, content, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
            [req.user.clinicId, patientId, req.user.id, type, direction || 'outbound', subject, content]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to log communication' });
    }
});

router.get('/newsletters', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM newsletter_campaigns WHERE clinic_id = $1 ORDER BY created_at DESC`,
            [req.user.clinicId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch newsletters' });
    }
});

router.post('/newsletters', authMiddleware, async (req, res) => {
    try {
        const { name, subject, content, recipientFilter, scheduledFor } = req.body;

        const result = await db.query(
            `INSERT INTO newsletter_campaigns (clinic_id, name, subject, content, recipient_filter, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [req.user.clinicId, name, subject, content, JSON.stringify(recipientFilter || {}), scheduledFor]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create newsletter' });
    }
});

module.exports = router;
