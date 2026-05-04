const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const normalizeImagePath = (value) => {
    if (!value) return null;
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
        return value;
    }
    return `/uploads/${value}`;
};

router.get('/overview', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;

        const [clinicResult, recordResult, productsResult, protocolsResult, statsResult] = await Promise.all([
            db.query(
                `SELECT id, name, type
                 FROM clinics
                 WHERE id = $1`,
                [clinicId]
            ),
            db.query(
                `SELECT ar.id, ar.procedure_type, ar.before_images, ar.after_images, ar.injection_points,
                        ar.procedure_date, ar.follow_up_date,
                        p.first_name, p.last_name
                 FROM aesthetic_records ar
                 LEFT JOIN patients p ON ar.patient_id = p.id
                 WHERE ar.clinic_id = $1
                 ORDER BY COALESCE(ar.procedure_date, ar.created_at) DESC
                 LIMIT 1`,
                [clinicId]
            ),
            db.query(
                `SELECT id, name, supplier, current_stock, min_stock_level, expiry_date
                 FROM products
                 WHERE clinic_id = $1
                   AND is_active = true
                   AND (
                       LOWER(COALESCE(category, '')) LIKE '%inject%'
                       OR LOWER(COALESCE(category, '')) LIKE '%filler%'
                       OR LOWER(COALESCE(category, '')) LIKE '%aesthetic%'
                       OR LOWER(COALESCE(name, '')) LIKE '%botox%'
                       OR LOWER(COALESCE(name, '')) LIKE '%juv%'
                       OR LOWER(COALESCE(name, '')) LIKE '%restylane%'
                 )
                 ORDER BY current_stock ASC, name ASC
                 LIMIT 5`,
                [clinicId]
            ),
            db.query(
                `SELECT id, name, duration_minutes, default_price
                 FROM services
                 WHERE clinic_id = $1
                   AND is_active = true
                   AND (
                       LOWER(COALESCE(category, '')) LIKE '%aesthetic%'
                       OR LOWER(COALESCE(category, '')) LIKE '%esth%'
                       OR LOWER(COALESCE(specialty, '')) LIKE '%aesthetic%'
                       OR LOWER(COALESCE(specialty, '')) LIKE '%esth%'
                   )
                 ORDER BY default_price DESC, duration_minutes DESC, name ASC
                 LIMIT 5`,
                [clinicId]
            ),
            db.query(
                `SELECT COUNT(*)::int AS total_records,
                        COUNT(*) FILTER (WHERE procedure_date >= NOW() - INTERVAL '30 days')::int AS recent_records
                 FROM aesthetic_records
                 WHERE clinic_id = $1`,
                [clinicId]
            )
        ]);

        const latestRecord = recordResult.rows[0] || null;
        const injectionPoints = latestRecord?.injection_points && typeof latestRecord.injection_points === 'object'
            ? Object.keys(latestRecord.injection_points).length
            : 0;

        res.json({
            success: true,
            data: {
                clinic: clinicResult.rows[0] || null,
                stats: {
                    totalRecords: statsResult.rows[0]?.total_records || 0,
                    recentRecords: statsResult.rows[0]?.recent_records || 0,
                    injectionPoints
                },
                latestRecord: latestRecord ? {
                    id: latestRecord.id,
                    procedureType: latestRecord.procedure_type,
                    patientName: latestRecord.first_name && latestRecord.last_name
                        ? `${latestRecord.first_name} ${latestRecord.last_name}`
                        : 'Patient',
                    procedureDate: latestRecord.procedure_date,
                    followUpDate: latestRecord.follow_up_date,
                    beforeImage: normalizeImagePath(latestRecord.before_images?.[0]),
                    afterImage: normalizeImagePath(latestRecord.after_images?.[0]),
                    injectionPoints: latestRecord.injection_points || {}
                } : null,
                stock: productsResult.rows.map((row) => ({
                    id: row.id,
                    name: row.name,
                    brand: row.supplier || 'Supplier not set',
                    stock: row.current_stock || 0,
                    minStock: row.min_stock_level || 0,
                    expiryDate: row.expiry_date,
                    alert: (row.current_stock || 0) <= (row.min_stock_level || 0)
                })),
                protocols: protocolsResult.rows.map((row) => ({
                    id: row.id,
                    title: row.name,
                    duration: row.duration_minutes || 0,
                    price: Number(row.default_price || 0)
                }))
            }
        });
    } catch (error) {
        console.error('Failed to fetch aesthetic overview:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch aesthetic overview' });
    }
});

module.exports = router;
