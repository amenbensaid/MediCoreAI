const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/current', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM clinics WHERE id = $1',
            [req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Clinic not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch clinic' });
    }
});

router.put('/current', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { name, address, city, postalCode, phone, email, website, settings } = req.body;

        const result = await db.query(
            `UPDATE clinics SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        postal_code = COALESCE($4, postal_code),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        website = COALESCE($7, website),
        settings = COALESCE($8, settings),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
            [name, address, city, postalCode, phone, email, website, JSON.stringify(settings), req.user.clinicId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update clinic' });
    }
});

router.get('/current/staff', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.specialty,
              uc.role as clinic_role, u.is_active
       FROM users u
       JOIN user_clinics uc ON u.id = uc.user_id
       WHERE uc.clinic_id = $1
       ORDER BY u.last_name, u.first_name`,
            [req.user.clinicId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch staff' });
    }
});

module.exports = router;
