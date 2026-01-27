const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.specialty,
              u.is_active, u.created_at, uc.role as clinic_role
       FROM users u
       LEFT JOIN user_clinics uc ON u.id = uc.user_id AND uc.clinic_id = $1
       WHERE uc.clinic_id = $1
       ORDER BY u.created_at DESC`,
            [req.user.clinicId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

router.get('/practitioners', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.specialty
       FROM users u
       JOIN user_clinics uc ON u.id = uc.user_id
       WHERE uc.clinic_id = $1 AND u.role IN ('practitioner', 'admin') AND u.is_active = true
       ORDER BY u.last_name, u.first_name`,
            [req.user.clinicId]
        );

        res.json({
            success: true,
            data: result.rows.map(u => ({
                id: u.id,
                name: `Dr. ${u.first_name} ${u.last_name}`,
                specialty: u.specialty
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch practitioners' });
    }
});

module.exports = router;
