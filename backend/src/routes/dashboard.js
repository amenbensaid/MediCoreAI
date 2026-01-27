const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;
        const today = new Date().toISOString().split('T')[0];
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const appointmentsToday = await db.query(
            `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status IN ('scheduled', 'confirmed')) as upcoming
       FROM appointments
       WHERE clinic_id = $1 AND DATE(start_time) = $2`,
            [clinicId, today]
        );

        const revenueToday = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE clinic_id = $1 AND DATE(payment_date) = $2`,
            [clinicId, today]
        );

        const revenueMonth = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE clinic_id = $1 AND payment_date >= $2`,
            [clinicId, startOfMonth]
        );

        const patients = await db.query(
            `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE created_at >= $2) as new_this_month
       FROM patients
       WHERE clinic_id = $1 AND is_active = true`,
            [clinicId, startOfMonth]
        );

        const pendingInvoices = await db.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(total_amount - paid_amount), 0) as amount
       FROM invoices
       WHERE clinic_id = $1 AND status NOT IN ('paid', 'cancelled')`,
            [clinicId]
        );

        const upcomingAppointments = await db.query(
            `SELECT a.id, a.start_time, a.appointment_type, a.status,
              p.first_name, p.last_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       WHERE a.clinic_id = $1 AND a.start_time >= NOW() AND a.status IN ('scheduled', 'confirmed')
       ORDER BY a.start_time ASC
       LIMIT 5`,
            [clinicId]
        );

        const recentPatients = await db.query(
            `SELECT id, first_name, last_name, created_at
       FROM patients
       WHERE clinic_id = $1 AND is_active = true
       ORDER BY created_at DESC
       LIMIT 5`,
            [clinicId]
        );

        res.json({
            success: true,
            data: {
                stats: {
                    appointmentsToday: parseInt(appointmentsToday.rows[0].total),
                    appointmentsCompleted: parseInt(appointmentsToday.rows[0].completed),
                    appointmentsUpcoming: parseInt(appointmentsToday.rows[0].upcoming),
                    revenueToday: parseFloat(revenueToday.rows[0].total),
                    revenueMonth: parseFloat(revenueMonth.rows[0].total),
                    totalPatients: parseInt(patients.rows[0].total),
                    newPatientsMonth: parseInt(patients.rows[0].new_this_month),
                    pendingInvoicesCount: parseInt(pendingInvoices.rows[0].count),
                    pendingInvoicesAmount: parseFloat(pendingInvoices.rows[0].amount)
                },
                upcomingAppointments: upcomingAppointments.rows.map(a => ({
                    id: a.id,
                    time: a.start_time,
                    type: a.appointment_type,
                    status: a.status,
                    patientName: `${a.first_name} ${a.last_name}`
                })),
                recentPatients: recentPatients.rows.map(p => ({
                    id: p.id,
                    name: `${p.first_name} ${p.last_name}`,
                    createdAt: p.created_at
                }))
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
});

router.get('/widgets', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;

        const alerts = [
            { id: 1, type: 'warning', message: '3 patients have high no-show probability today', priority: 'high' },
            { id: 2, type: 'info', message: 'Low stock alert: Botox inventory below minimum', priority: 'medium' },
            { id: 3, type: 'success', message: 'Revenue target achieved for this month', priority: 'low' }
        ];

        res.json({ success: true, data: { alerts } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch widgets' });
    }
});

module.exports = router;
