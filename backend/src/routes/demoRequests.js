const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

const allowedStatuses = ['pending', 'accepted', 'declined'];
const allowedPlans = ['starter', 'professional', 'enterprise'];
const allowedClinicTypes = ['general', 'dental', 'aesthetic', 'veterinary', 'other'];

const getValidationMessage = (req) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return null;
    }

    return errors.array()[0]?.msg || 'Invalid request';
};

router.post('/', [
    body('fullName').trim().notEmpty().withMessage('Le nom complet est requis'),
    body('email').isEmail().normalizeEmail().withMessage('Un email valide est requis'),
    body('phone').optional({ values: 'falsy' }).trim(),
    body('companyName').trim().notEmpty().withMessage('Le nom de la structure est requis'),
    body('clinicType').optional({ values: 'falsy' }).isIn(allowedClinicTypes).withMessage('Type de clinique invalide'),
    body('desiredPlan').optional({ values: 'falsy' }).isIn(allowedPlans).withMessage('Offre invalide'),
    body('teamSize').optional({ values: 'falsy' }).isInt({ min: 1, max: 100000 }).withMessage('Taille d’équipe invalide'),
    body('preferredDemoDate').optional({ values: 'falsy' }).isISO8601().withMessage('Date de démo invalide'),
    body('message').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }).withMessage('Le message est trop long')
], async (req, res) => {
    const message = getValidationMessage(req);
    if (message) {
        return res.status(400).json({ success: false, message });
    }

    try {
        const {
            fullName,
            email,
            phone,
            companyName,
            clinicType,
            desiredPlan,
            teamSize,
            preferredDemoDate,
            message: requestMessage
        } = req.body;

        const result = await db.query(
            `INSERT INTO demo_requests (
                full_name,
                email,
                phone,
                company_name,
                clinic_type,
                desired_plan,
                team_size,
                preferred_demo_date,
                message
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, status, created_at`,
            [
                fullName,
                email,
                phone || null,
                companyName,
                clinicType || null,
                desiredPlan || 'professional',
                teamSize ? parseInt(teamSize, 10) : null,
                preferredDemoDate || null,
                requestMessage || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Demo request submitted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Failed to create demo request:', error);
        return res.status(500).json({ success: false, message: 'Failed to submit demo request' });
    }
});

router.get('/', authMiddleware, requireRole('admin'), [
    query('status').optional().isIn(allowedStatuses).withMessage('Invalid status filter')
], async (req, res) => {
    const message = getValidationMessage(req);
    if (message) {
        return res.status(400).json({ success: false, message });
    }

    try {
        const params = [];
        let whereClause = '';

        if (req.query.status) {
            params.push(req.query.status);
            whereClause = `WHERE status = $${params.length}`;
        }

        const requestsResult = await db.query(
            `SELECT id, full_name, email, phone, company_name, clinic_type, desired_plan,
                    team_size, preferred_demo_date, message, status, reviewed_at, reviewed_by,
                    created_at, updated_at
             FROM demo_requests
             ${whereClause}
             ORDER BY created_at DESC`,
            params
        );

        const statsResult = await db.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
                COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
                COUNT(*) FILTER (WHERE status = 'declined')::int AS declined
             FROM demo_requests`
        );

        return res.json({
            success: true,
            data: {
                requests: requestsResult.rows,
                stats: statsResult.rows[0]
            }
        });
    } catch (error) {
        console.error('Failed to fetch demo requests:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch demo requests' });
    }
});

router.patch('/:id/status', authMiddleware, requireRole('admin'), [
    param('id').isUUID().withMessage('Invalid request id'),
    body('status').isIn(['accepted', 'declined']).withMessage('Invalid status')
], async (req, res) => {
    const message = getValidationMessage(req);
    if (message) {
        return res.status(400).json({ success: false, message });
    }

    try {
        const result = await db.query(
            `UPDATE demo_requests
             SET status = $1,
                 reviewed_at = CURRENT_TIMESTAMP,
                 reviewed_by = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, status, reviewed_at`,
            [req.body.status, req.user.id, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Demo request not found' });
        }

        return res.json({
            success: true,
            message: 'Demo request updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Failed to update demo request:', error);
        return res.status(500).json({ success: false, message: 'Failed to update demo request' });
    }
});

module.exports = router;
