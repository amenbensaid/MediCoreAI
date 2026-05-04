const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getOwnedPractitionerId } = require('../utils/staffScope');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE i.clinic_id = $1';
        const params = [req.user.clinicId];
        const practitionerScopeId = getOwnedPractitionerId(req.user);

        if (status) {
            params.push(status);
            whereClause += ` AND i.status = $${params.length}`;
        }

        if (practitionerScopeId) {
            params.push(practitionerScopeId);
            whereClause += ` AND i.practitioner_id = $${params.length}`;
        }

        const result = await db.query(
            `SELECT i.*, p.first_name, p.last_name, p.email
       FROM invoices i
       LEFT JOIN patients p ON i.patient_id = p.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );

        const countResult = await db.query(
            `SELECT COUNT(*) FROM invoices i ${whereClause}`, params
        );

        res.json({
            success: true,
            data: {
                invoices: result.rows.map(i => ({
                    id: i.id,
                    invoiceNumber: i.invoice_number,
                    patientName: `${i.first_name} ${i.last_name}`,
                    patientEmail: i.email,
                    status: i.status,
                    subtotal: parseFloat(i.subtotal),
                    taxAmount: parseFloat(i.tax_amount),
                    totalAmount: parseFloat(i.total_amount),
                    paidAmount: parseFloat(i.paid_amount),
                    balance: parseFloat(i.total_amount) - parseFloat(i.paid_amount),
                    dueDate: i.due_date,
                    createdAt: i.created_at
                })),
                totalCount: parseInt(countResult.rows[0].count)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT i.*, p.first_name, p.last_name, p.email, p.phone, p.address, p.city
       FROM invoices i
       LEFT JOIN patients p ON i.patient_id = p.id
       WHERE i.id = $1 AND i.clinic_id = $2`,
            [req.params.id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        const items = await db.query(
            `SELECT * FROM invoice_items WHERE invoice_id = $1`,
            [req.params.id]
        );

        const payments = await db.query(
            `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC`,
            [req.params.id]
        );

        const invoice = result.rows[0];
        res.json({
            success: true,
            data: {
                ...invoice,
                items: items.rows,
                payments: payments.rows
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { patientId, items, dueDate, notes } = req.body;
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const countResult = await client.query(
                'SELECT COUNT(*) FROM invoices WHERE clinic_id = $1',
                [req.user.clinicId]
            );
            const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(5, '0')}`;

            let subtotal = 0;
            let taxAmount = 0;
            items.forEach(item => {
                const itemTotal = item.quantity * item.unitPrice;
                subtotal += itemTotal;
                taxAmount += itemTotal * (item.taxRate || 20) / 100;
            });
            const totalAmount = subtotal + taxAmount;

            const invoiceResult = await client.query(
                `INSERT INTO invoices (invoice_number, clinic_id, patient_id, practitioner_id,
          subtotal, tax_amount, total_amount, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
                [invoiceNumber, req.user.clinicId, patientId, req.user.id,
                    subtotal, taxAmount, totalAmount, dueDate, notes]
            );

            for (const item of items) {
                const itemTotal = item.quantity * item.unitPrice * (1 + (item.taxRate || 20) / 100);
                await client.query(
                    `INSERT INTO invoice_items (invoice_id, service_id, description, quantity, unit_price, tax_rate, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [invoiceResult.rows[0].id, item.serviceId, item.description, item.quantity, item.unitPrice, item.taxRate || 20, itemTotal]
                );
            }

            await client.query('COMMIT');
            res.status(201).json({ success: true, data: invoiceResult.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create invoice' });
    }
});

router.post('/:id/payments', authMiddleware, async (req, res) => {
    try {
        const { amount, paymentMethod, referenceNumber, notes } = req.body;
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const invoice = await client.query(
                'SELECT * FROM invoices WHERE id = $1 AND clinic_id = $2',
                [req.params.id, req.user.clinicId]
            );

            if (invoice.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Invoice not found' });
            }

            await client.query(
                `INSERT INTO payments (invoice_id, clinic_id, amount, payment_method, reference_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [req.params.id, req.user.clinicId, amount, paymentMethod, referenceNumber, notes]
            );

            const newPaidAmount = parseFloat(invoice.rows[0].paid_amount) + parseFloat(amount);
            const newStatus = newPaidAmount >= parseFloat(invoice.rows[0].total_amount) ? 'paid' : 'partial';

            await client.query(
                `UPDATE invoices SET paid_amount = $1, status = $2, paid_at = CASE WHEN $2 = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END
         WHERE id = $3`,
                [newPaidAmount, newStatus, req.params.id]
            );

            await client.query('COMMIT');
            res.json({ success: true, message: 'Payment recorded' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to record payment' });
    }
});

module.exports = router;
