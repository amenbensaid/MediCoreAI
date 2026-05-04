const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getOwnedPractitionerId } = require('../utils/staffScope');

const router = express.Router();

const startOfDay = (date) => {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
};

const formatPercentChange = (current, previous) => {
    const currentValue = Number(current) || 0;
    const previousValue = Number(previous) || 0;

    if (previousValue === 0) {
        if (currentValue === 0) return '0%';
        return '+100%';
    }

    const delta = ((currentValue - previousValue) / previousValue) * 100;
    const rounded = Math.round(delta);
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
};

const formatRelativeTime = (dateValue) => {
    if (!dateValue) return null;

    const seconds = Math.round((Date.now() - new Date(dateValue).getTime()) / 1000);
    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
};

const buildLastSevenDays = () => {
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
        const date = startOfDay(new Date(Date.now() - offset * 24 * 60 * 60 * 1000));
        days.push({
            key: date.toISOString().slice(0, 10),
            label: date.toLocaleDateString('en-US', { weekday: 'short' })
        });
    }
    return days;
};

router.get('/', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;
        const todayDate = new Date();
        const today = todayDate.toISOString().split('T')[0];
        const yesterdayDate = startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const yesterday = yesterdayDate.toISOString().split('T')[0];
        const currentMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
        const previousMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
        const previousMonthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0, 23, 59, 59, 999);
        const lastSevenDays = buildLastSevenDays();
        const chartStart = lastSevenDays[0].key;
        const practitionerScopeId = getOwnedPractitionerId(req.user);
        const appointmentScopeClause = practitionerScopeId ? 'AND practitioner_id = $3' : '';
        const appointmentScopeParams = practitionerScopeId ? [practitionerScopeId] : [];
        const paymentScopeJoin = practitionerScopeId ? 'JOIN invoices scoped_invoice ON scoped_invoice.id = payments.invoice_id' : '';
        const paymentScopeClause = practitionerScopeId ? 'AND scoped_invoice.practitioner_id = $3' : '';

        const appointmentsToday = await db.query(
            `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status IN ('scheduled', 'confirmed')) as upcoming
       FROM appointments
       WHERE clinic_id = $1 AND DATE(start_time) = $2 ${appointmentScopeClause}`,
            [clinicId, today, ...appointmentScopeParams]
        );

        const appointmentsYesterday = await db.query(
            `SELECT COUNT(*) as total
       FROM appointments
       WHERE clinic_id = $1 AND DATE(start_time) = $2 ${appointmentScopeClause}`,
            [clinicId, yesterday, ...appointmentScopeParams]
        );

        const revenueToday = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       ${paymentScopeJoin}
       WHERE payments.clinic_id = $1 AND DATE(payment_date) = $2 ${paymentScopeClause}`,
            [clinicId, today, ...appointmentScopeParams]
        );

        const revenueYesterday = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       ${paymentScopeJoin}
       WHERE payments.clinic_id = $1 AND DATE(payment_date) = $2 ${paymentScopeClause}`,
            [clinicId, yesterday, ...appointmentScopeParams]
        );

        const revenueMonth = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       ${paymentScopeJoin}
       WHERE payments.clinic_id = $1 AND payment_date >= $2 ${paymentScopeClause}`,
            [clinicId, currentMonthStart.toISOString(), ...appointmentScopeParams]
        );

        const revenuePreviousMonth = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       ${paymentScopeJoin}
       WHERE payments.clinic_id = $1 AND payment_date >= $2 AND payment_date <= $3 ${practitionerScopeId ? 'AND scoped_invoice.practitioner_id = $4' : ''}`,
            [clinicId, previousMonthStart.toISOString(), previousMonthEnd.toISOString(), ...appointmentScopeParams]
        );

        const patients = await db.query(
            `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE created_at >= $2) as new_this_month
       FROM patients
       WHERE clinic_id = $1 AND is_active = true ${practitionerScopeId ? `AND (
            primary_practitioner_id = $3
            OR EXISTS (
                SELECT 1 FROM appointments scoped_apt
                WHERE scoped_apt.patient_id = patients.id
                  AND scoped_apt.practitioner_id = $3
            )
       )` : ''}`,
            [clinicId, currentMonthStart.toISOString(), ...appointmentScopeParams]
        );

        const patientsPreviousMonth = await db.query(
            `SELECT COUNT(*) as total
       FROM patients
       WHERE clinic_id = $1 AND created_at >= $2 AND created_at <= $3 ${practitionerScopeId ? `AND (
            primary_practitioner_id = $4
            OR EXISTS (
                SELECT 1 FROM appointments scoped_apt
                WHERE scoped_apt.patient_id = patients.id
                  AND scoped_apt.practitioner_id = $4
            )
       )` : ''}`,
            [clinicId, previousMonthStart.toISOString(), previousMonthEnd.toISOString(), ...appointmentScopeParams]
        );

        const pendingInvoices = await db.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(total_amount - paid_amount), 0) as amount
       FROM invoices
       WHERE clinic_id = $1 AND status NOT IN ('paid', 'cancelled') ${practitionerScopeId ? 'AND practitioner_id = $2' : ''}`,
            [clinicId, ...appointmentScopeParams]
        );

        const pendingInvoicesPreviousMonth = await db.query(
            `SELECT COALESCE(SUM(total_amount - paid_amount), 0) as amount
       FROM invoices
       WHERE clinic_id = $1
         AND status NOT IN ('paid', 'cancelled')
         AND created_at >= $2
         AND created_at <= $3 ${practitionerScopeId ? 'AND practitioner_id = $4' : ''}`,
            [clinicId, previousMonthStart.toISOString(), previousMonthEnd.toISOString(), ...appointmentScopeParams]
        );

        const upcomingAppointments = await db.query(
            `SELECT a.id, a.start_time, a.appointment_type, a.status,
              p.first_name, p.last_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       WHERE a.clinic_id = $1 AND a.start_time >= NOW() AND a.status IN ('awaiting_approval', 'scheduled', 'confirmed')
         ${practitionerScopeId ? 'AND a.practitioner_id = $2' : ''}
       ORDER BY a.start_time ASC
       LIMIT 5`,
            [clinicId, ...appointmentScopeParams]
        );

        const recentPatients = await db.query(
            `SELECT id, first_name, last_name, created_at
       FROM patients
       WHERE clinic_id = $1 AND is_active = true ${practitionerScopeId ? `AND (
            primary_practitioner_id = $2
            OR EXISTS (
                SELECT 1 FROM appointments scoped_apt
                WHERE scoped_apt.patient_id = patients.id
                  AND scoped_apt.practitioner_id = $2
            )
       )` : ''}
       ORDER BY created_at DESC
       LIMIT 5`,
            [clinicId, ...appointmentScopeParams]
        );

        const revenueSeriesResult = await db.query(
            `SELECT DATE(payment_date) as date, COALESCE(SUM(amount), 0) as total
       FROM payments
       ${paymentScopeJoin}
       WHERE payments.clinic_id = $1 AND DATE(payment_date) >= $2 ${paymentScopeClause}
       GROUP BY DATE(payment_date)
       ORDER BY date ASC`,
            [clinicId, chartStart, ...appointmentScopeParams]
        );

        const appointmentSeriesResult = await db.query(
            `SELECT DATE(start_time) as date, COUNT(*) as total
       FROM appointments
       WHERE clinic_id = $1 AND DATE(start_time) >= $2 ${practitionerScopeId ? 'AND practitioner_id = $3' : ''}
       GROUP BY DATE(start_time)
       ORDER BY date ASC`,
            [clinicId, chartStart, ...appointmentScopeParams]
        );

        const unconfirmedToday = await db.query(
            `SELECT COUNT(*) as total
       FROM appointments
       WHERE clinic_id = $1 AND DATE(start_time) = $2 AND status IN ('scheduled', 'awaiting_approval') ${appointmentScopeClause}`,
            [clinicId, today, ...appointmentScopeParams]
        );

        const overdueInvoices = await db.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(total_amount - paid_amount), 0) as amount
       FROM invoices
       WHERE clinic_id = $1
         AND status NOT IN ('paid', 'cancelled')
         AND due_date IS NOT NULL
         AND due_date < CURRENT_DATE ${practitionerScopeId ? 'AND practitioner_id = $2' : ''}`,
            [clinicId, ...appointmentScopeParams]
        );

        const lowStockProducts = await db.query(
            `SELECT COUNT(*) as count
       FROM products
       WHERE clinic_id = $1 AND is_active = true AND current_stock <= COALESCE(min_stock_level, 0)`,
            [clinicId]
        );

        const paymentsTodayCount = await db.query(
            `SELECT COUNT(*) as count
       FROM payments
       ${paymentScopeJoin}
       WHERE payments.clinic_id = $1 AND DATE(payment_date) = $2 ${paymentScopeClause}`,
            [clinicId, today, ...appointmentScopeParams]
        );

        const revenueByDate = new Map(
            revenueSeriesResult.rows.map((row) => [row.date.toISOString().slice(0, 10), parseFloat(row.total)])
        );
        const appointmentsByDate = new Map(
            appointmentSeriesResult.rows.map((row) => [row.date.toISOString().slice(0, 10), parseInt(row.total, 10)])
        );

        const revenueSeries = lastSevenDays.map((day) => ({
            name: day.label,
            revenue: revenueByDate.get(day.key) || 0
        }));

        const appointmentSeries = lastSevenDays.map((day) => ({
            name: day.label,
            appts: appointmentsByDate.get(day.key) || 0
        }));

        const alerts = [];
        const overdueCount = parseInt(overdueInvoices.rows[0].count, 10);
        const lowStockCount = parseInt(lowStockProducts.rows[0].count, 10);
        const scheduledCount = parseInt(unconfirmedToday.rows[0].total, 10);
        const currentRevenueMonth = parseFloat(revenueMonth.rows[0].total);
        const previousRevenueMonth = parseFloat(revenuePreviousMonth.rows[0].total);

        if (overdueCount > 0) {
            alerts.push({
                id: 'overdue-invoices',
                type: 'warning',
                title: 'Overdue Invoices',
                message: `${overdueCount} unpaid invoice${overdueCount > 1 ? 's are' : ' is'} overdue`
            });
        }

        if (scheduledCount > 0) {
            alerts.push({
                id: 'scheduled-today',
                type: 'info',
                title: 'Demandes de rendez-vous',
                message: `${scheduledCount} demande${scheduledCount > 1 ? 's' : ''} patient attend${scheduledCount > 1 ? 'ent' : ''} votre validation aujourd’hui`
            });
        }

        if (lowStockCount > 0) {
            alerts.push({
                id: 'low-stock',
                type: 'warning',
                title: 'Low Stock',
                message: `${lowStockCount} product${lowStockCount > 1 ? 's are' : ' is'} at or below minimum stock`
            });
        }

        if (currentRevenueMonth > previousRevenueMonth) {
            const growth = formatPercentChange(currentRevenueMonth, previousRevenueMonth);
            alerts.push({
                id: 'revenue-growth',
                type: 'success',
                title: 'Revenue Growth',
                message: `Monthly revenue is up ${growth} versus last month`
            });
        }

        if (alerts.length === 0) {
            alerts.push({
                id: 'all-clear',
                type: 'success',
                title: 'Operations Stable',
                message: 'No urgent billing, stock, or scheduling issues detected'
            });
        }

        const notifications = [];
        if (scheduledCount > 0) {
            notifications.push({
                id: 'appointment-requests',
                type: 'warning',
                title: 'Demandes à valider',
                message: `${scheduledCount} demande${scheduledCount > 1 ? 's' : ''} patient attend${scheduledCount > 1 ? 'ent' : ''} votre confirmation`,
                time: 'maintenant'
            });
        }

        const nextAppointment = upcomingAppointments.rows[0];
        if (nextAppointment) {
            notifications.push({
                id: `appointment-${nextAppointment.id}`,
                type: 'info',
                title: nextAppointment.status === 'awaiting_approval' ? 'Nouvelle demande' : 'Prochain rendez-vous',
                message: `${nextAppointment.first_name || 'Patient'} ${nextAppointment.last_name || ''}`.trim(),
                time: formatRelativeTime(nextAppointment.start_time)
            });
        }

        const newestPatient = recentPatients.rows[0];
        if (newestPatient) {
            notifications.push({
                id: `patient-${newestPatient.id}`,
                type: 'success',
                title: 'New patient',
                message: `${newestPatient.first_name} ${newestPatient.last_name} was recently added`,
                time: formatRelativeTime(newestPatient.created_at)
            });
        }

        if (parseInt(paymentsTodayCount.rows[0].count, 10) > 0) {
            notifications.push({
                id: 'payments-today',
                type: 'success',
                title: 'Payments received',
                message: `${paymentsTodayCount.rows[0].count} payment(s) recorded today`,
                time: 'today'
            });
        }

        if (overdueCount > 0) {
            notifications.push({
                id: 'overdue-reminder',
                type: 'warning',
                title: 'Overdue balance',
                message: `${parseFloat(overdueInvoices.rows[0].amount).toLocaleString('fr-FR')} € still to collect`,
                time: 'attention'
            });
        }

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
                    pendingInvoicesAmount: parseFloat(pendingInvoices.rows[0].amount),
                    appointmentsTrend: formatPercentChange(appointmentsToday.rows[0].total, appointmentsYesterday.rows[0].total),
                    revenueTrend: formatPercentChange(revenueToday.rows[0].total, revenueYesterday.rows[0].total),
                    patientsTrend: formatPercentChange(patients.rows[0].new_this_month, patientsPreviousMonth.rows[0].total),
                    pendingInvoicesTrend: formatPercentChange(
                        -parseFloat(pendingInvoices.rows[0].amount),
                        -parseFloat(pendingInvoicesPreviousMonth.rows[0].amount)
                    )
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
                })),
                charts: {
                    revenue: revenueSeries,
                    appointments: appointmentSeries
                },
                alerts,
                notifications: notifications.slice(0, 5)
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
        const today = new Date().toISOString().split('T')[0];

        const [scheduled, overdue, lowStock] = await Promise.all([
            db.query(
                `SELECT COUNT(*) as total
         FROM appointments
         WHERE clinic_id = $1 AND DATE(start_time) = $2 AND status = 'scheduled'`,
                [clinicId, today]
            ),
            db.query(
                `SELECT COUNT(*) as total
         FROM invoices
         WHERE clinic_id = $1 AND status NOT IN ('paid', 'cancelled') AND due_date IS NOT NULL AND due_date < CURRENT_DATE`,
                [clinicId]
            ),
            db.query(
                `SELECT COUNT(*) as total
         FROM products
         WHERE clinic_id = $1 AND is_active = true AND current_stock <= COALESCE(min_stock_level, 0)`,
                [clinicId]
            )
        ]);

        const alerts = [
            {
                id: 'scheduled',
                type: 'info',
                priority: 'medium',
                message: `${parseInt(scheduled.rows[0].total, 10)} unconfirmed appointment(s) today`
            },
            {
                id: 'overdue',
                type: 'warning',
                priority: 'high',
                message: `${parseInt(overdue.rows[0].total, 10)} overdue invoice(s)`
            },
            {
                id: 'low-stock',
                type: 'warning',
                priority: 'medium',
                message: `${parseInt(lowStock.rows[0].total, 10)} low-stock product(s)`
            }
        ];

        res.json({ success: true, data: { alerts } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch widgets' });
    }
});

module.exports = router;
