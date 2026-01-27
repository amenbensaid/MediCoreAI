const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/revenue', authMiddleware, async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const clinicId = req.user.clinicId;

        let startDate;
        if (period === '7days') startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        else if (period === '30days') startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        else if (period === '90days') startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        else if (period === '1year') startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        else startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const result = await db.query(
            `SELECT DATE(payment_date) as date, SUM(amount) as revenue
       FROM payments
       WHERE clinic_id = $1 AND payment_date >= $2
       GROUP BY DATE(payment_date)
       ORDER BY date ASC`,
            [clinicId, startDate.toISOString()]
        );

        const totalRevenue = result.rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0);

        res.json({
            success: true,
            data: {
                period,
                totalRevenue,
                dailyRevenue: result.rows.map(r => ({
                    date: r.date,
                    revenue: parseFloat(r.revenue)
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics' });
    }
});

router.get('/appointments', authMiddleware, async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const clinicId = req.user.clinicId;

        let startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const result = await db.query(
            `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show
       FROM appointments
       WHERE clinic_id = $1 AND start_time >= $2`,
            [clinicId, startDate.toISOString()]
        );

        const byType = await db.query(
            `SELECT appointment_type, COUNT(*) as count
       FROM appointments
       WHERE clinic_id = $1 AND start_time >= $2
       GROUP BY appointment_type
       ORDER BY count DESC`,
            [clinicId, startDate.toISOString()]
        );

        res.json({
            success: true,
            data: {
                summary: {
                    total: parseInt(result.rows[0].total),
                    completed: parseInt(result.rows[0].completed),
                    cancelled: parseInt(result.rows[0].cancelled),
                    noShow: parseInt(result.rows[0].no_show),
                    completionRate: result.rows[0].total > 0
                        ? Math.round((result.rows[0].completed / result.rows[0].total) * 100)
                        : 0
                },
                byType: byType.rows
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch appointment analytics' });
    }
});

router.get('/patients', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;

        const growth = await db.query(
            `SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as new_patients
       FROM patients
       WHERE clinic_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
            [clinicId]
        );

        const demographics = await db.query(
            `SELECT gender, COUNT(*) as count
       FROM patients
       WHERE clinic_id = $1 AND is_active = true AND gender IS NOT NULL
       GROUP BY gender`,
            [clinicId]
        );

        const bySource = await db.query(
            `SELECT COALESCE(referral_source, 'Unknown') as source, COUNT(*) as count
       FROM patients
       WHERE clinic_id = $1 AND is_active = true
       GROUP BY referral_source
       ORDER BY count DESC
       LIMIT 10`,
            [clinicId]
        );

        res.json({
            success: true,
            data: {
                growth: growth.rows.map(g => ({ month: g.month, count: parseInt(g.new_patients) })),
                demographics: demographics.rows,
                bySource: bySource.rows
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch patient analytics' });
    }
});

router.get('/financial-summary', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;
        const currentMonth = new Date().toISOString().slice(0, 7);

        const result = await db.query(
            `SELECT 
        COALESCE(SUM(total_amount), 0) as invoiced,
        COALESCE(SUM(paid_amount), 0) as collected,
        COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status NOT IN ('paid', 'cancelled')), 0) as outstanding
       FROM invoices
       WHERE clinic_id = $1 AND TO_CHAR(created_at, 'YYYY-MM') = $2`,
            [clinicId, currentMonth]
        );

        res.json({
            success: true,
            data: {
                invoiced: parseFloat(result.rows[0].invoiced),
                collected: parseFloat(result.rows[0].collected),
                outstanding: parseFloat(result.rows[0].outstanding)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch financial summary' });
    }
});

module.exports = router;
