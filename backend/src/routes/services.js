const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { category, isActive = 'true' } = req.query;
        let query = 'SELECT * FROM services WHERE clinic_id = $1';
        const params = [req.user.clinicId];

        if (category) {
            query += ' AND category = $2';
            params.push(category);
        }
        if (isActive !== 'all') {
            query += ` AND is_active = $${params.length + 1}`;
            params.push(isActive === 'true');
        }
        query += ' ORDER BY category, name';

        const result = await db.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch services' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { code, name, description, category, specialty, defaultPrice, taxRate, durationMinutes } = req.body;

        const result = await db.query(
            `INSERT INTO services (clinic_id, code, name, description, category, specialty, default_price, tax_rate, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [req.user.clinicId, code, name, description, category, specialty, defaultPrice, taxRate || 20, durationMinutes || 30]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create service' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { code, name, description, category, defaultPrice, taxRate, durationMinutes, isActive } = req.body;

        const result = await db.query(
            `UPDATE services SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        category = COALESCE($4, category),
        default_price = COALESCE($5, default_price),
        tax_rate = COALESCE($6, tax_rate),
        duration_minutes = COALESCE($7, duration_minutes),
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND clinic_id = $10
       RETURNING *`,
            [code, name, description, category, defaultPrice, taxRate, durationMinutes, isActive, req.params.id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update service' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE services SET is_active = false WHERE id = $1 AND clinic_id = $2 RETURNING id',
            [req.params.id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        res.json({ success: true, message: 'Service deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete service' });
    }
});

module.exports = router;
