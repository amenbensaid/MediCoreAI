const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const params = [req.user.clinicId];
        let practitionerFilter = '';

        if (req.user.role === 'practitioner') {
            params.push(req.user.id);
            practitionerFilter = `AND pr.practitioner_id = $${params.length}`;
        }

        const result = await db.query(
            `SELECT pr.id, pr.rating, pr.review_text, pr.is_visible, pr.created_at, pr.updated_at,
                    pr.practitioner_id, pr.patient_id, pr.appointment_id,
                    u.first_name AS practitioner_first_name, u.last_name AS practitioner_last_name, u.specialty,
                    p.first_name AS patient_first_name, p.last_name AS patient_last_name,
                    a.appointment_type, a.start_time,
                    AVG(pr.rating) OVER (PARTITION BY pr.practitioner_id) AS practitioner_average_rating,
                    COUNT(*) OVER (PARTITION BY pr.practitioner_id) AS practitioner_reviews_count
             FROM practitioner_reviews pr
             JOIN users u ON u.id = pr.practitioner_id
             JOIN patients p ON p.id = pr.patient_id
             LEFT JOIN appointments a ON a.id = pr.appointment_id
             WHERE pr.clinic_id = $1
               ${practitionerFilter}
             ORDER BY pr.created_at DESC`,
            params
        );

        res.json({
            success: true,
            data: result.rows.map((row) => ({
                id: row.id,
                rating: Number(row.rating),
                reviewText: row.review_text || '',
                isVisible: Boolean(row.is_visible),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                practitioner: {
                    id: row.practitioner_id,
                    fullName: `Dr. ${row.practitioner_first_name} ${row.practitioner_last_name}`,
                    specialty: row.specialty || ''
                },
                patient: {
                    id: row.patient_id,
                    fullName: `${row.patient_first_name} ${row.patient_last_name}`
                },
                appointment: row.appointment_id ? {
                    id: row.appointment_id,
                    type: row.appointment_type,
                    startTime: row.start_time
                } : null,
                practitionerSummary: {
                    averageRating: Number(parseFloat(row.practitioner_average_rating || 0).toFixed(1)),
                    reviewsCount: Number(row.practitioner_reviews_count || 0)
                }
            }))
        });
    } catch (error) {
        console.error('Failed to fetch reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
});

module.exports = router;
