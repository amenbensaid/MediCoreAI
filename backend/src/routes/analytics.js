const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const getStartDate = (period = '30days') => {
    if (period === '7days') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (period === '30days') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (period === '90days') return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    if (period === '1year') return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
};

router.get('/revenue', authMiddleware, async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const clinicId = req.user.clinicId;
        const startDate = getStartDate(period);

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
        const startDate = getStartDate(period);

        const result = await db.query(
            `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'awaiting_approval') as awaiting_approval,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
       FROM appointments
       WHERE clinic_id = $1 AND start_time >= $2`,
            [clinicId, startDate.toISOString()]
        );

        const byStatus = await db.query(
            `SELECT status, COUNT(*) as count
       FROM appointments
       WHERE clinic_id = $1 AND start_time >= $2
       GROUP BY status
       ORDER BY count DESC`,
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
                    scheduled: parseInt(result.rows[0].scheduled),
                    confirmed: parseInt(result.rows[0].confirmed),
                    awaitingApproval: parseInt(result.rows[0].awaiting_approval),
                    inProgress: parseInt(result.rows[0].in_progress),
                    completionRate: result.rows[0].total > 0
                        ? Math.round((result.rows[0].completed / result.rows[0].total) * 100)
                        : 0
                },
                byStatus: byStatus.rows.map(row => ({
                    status: row.status,
                    count: parseInt(row.count)
                })),
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
        const { period = '30days' } = req.query;
        const clinicId = req.user.clinicId;
        const startDate = getStartDate(period);

        const result = await db.query(
            `SELECT 
        COALESCE(SUM(total_amount), 0) as invoiced,
        COALESCE(SUM(paid_amount), 0) as collected,
        COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status NOT IN ('paid', 'cancelled')), 0) as outstanding
       FROM invoices
       WHERE clinic_id = $1 AND created_at >= $2`,
            [clinicId, startDate.toISOString()]
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
