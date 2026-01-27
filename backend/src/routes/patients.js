const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            sortBy = 'created_at',
            sortOrder = 'DESC',
            isActive = 'true'
        } = req.query;

        const offset = (page - 1) * limit;
        const clinicId = req.user.clinicId;

        let whereClause = 'WHERE clinic_id = $1';
        const params = [clinicId];
        let paramIndex = 2;

        if (search) {
            whereClause += ` AND (
        LOWER(first_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(email) LIKE LOWER($${paramIndex}) OR
        phone LIKE $${paramIndex} OR
        patient_number LIKE $${paramIndex}
      )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (isActive !== 'all') {
            whereClause += ` AND is_active = $${paramIndex}`;
            params.push(isActive === 'true');
            paramIndex++;
        }
        const allowedSortColumns = ['created_at', 'first_name', 'last_name', 'date_of_birth', 'patient_number'];
        const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const countResult = await db.query(
            `SELECT COUNT(*) FROM patients ${whereClause}`,
            params
        );
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await db.query(
            `SELECT id, patient_number, first_name, last_name, date_of_birth, gender,
              email, phone, mobile, city, is_active, created_at,
              (SELECT COUNT(*) FROM appointments WHERE patient_id = patients.id) as appointment_count
       FROM patients
       ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                patients: result.rows.map(p => ({
                    id: p.id,
                    patientNumber: p.patient_number,
                    firstName: p.first_name,
                    lastName: p.last_name,
                    fullName: `${p.first_name} ${p.last_name}`,
                    dateOfBirth: p.date_of_birth,
                    gender: p.gender,
                    email: p.email,
                    phone: p.phone,
                    mobile: p.mobile,
                    city: p.city,
                    isActive: p.is_active,
                    appointmentCount: parseInt(p.appointment_count),
                    createdAt: p.created_at
                })),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch patients' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const clinicId = req.user.clinicId;

        const result = await db.query(
            `SELECT * FROM patients WHERE id = $1 AND clinic_id = $2`,
            [id, clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const patient = result.rows[0];

        const appointmentsResult = await db.query(
            `SELECT a.id, a.appointment_type, a.title, a.start_time, a.end_time, a.status,
              u.first_name as practitioner_first_name, u.last_name as practitioner_last_name
       FROM appointments a
       LEFT JOIN users u ON a.practitioner_id = u.id
       WHERE a.patient_id = $1
       ORDER BY a.start_time DESC
       LIMIT 10`,
            [id]
        );

        const recordsResult = await db.query(
            `SELECT id, record_type, chief_complaint, diagnosis, record_date
       FROM medical_records
       WHERE patient_id = $1
       ORDER BY record_date DESC
       LIMIT 5`,
            [id]
        );

        const invoicesResult = await db.query(
            `SELECT id, invoice_number, total_amount, paid_amount, status, created_at
       FROM invoices
       WHERE patient_id = $1 AND status NOT IN ('paid', 'cancelled')
       ORDER BY created_at DESC
       LIMIT 5`,
            [id]
        );

        res.json({
            success: true,
            data: {
                id: patient.id,
                patientNumber: patient.patient_number,
                firstName: patient.first_name,
                lastName: patient.last_name,
                fullName: `${patient.first_name} ${patient.last_name}`,
                dateOfBirth: patient.date_of_birth,
                gender: patient.gender,
                email: patient.email,
                phone: patient.phone,
                mobile: patient.mobile,
                address: patient.address,
                city: patient.city,
                postalCode: patient.postal_code,
                country: patient.country,
                socialSecurityNumber: patient.social_security_number,
                insuranceProvider: patient.insurance_provider,
                insuranceNumber: patient.insurance_number,
                emergencyContactName: patient.emergency_contact_name,
                emergencyContactPhone: patient.emergency_contact_phone,
                bloodType: patient.blood_type,
                allergies: patient.allergies || [],
                chronicConditions: patient.chronic_conditions || [],
                currentMedications: patient.current_medications || [],
                notes: patient.notes,
                referralSource: patient.referral_source,
                isActive: patient.is_active,
                createdAt: patient.created_at,
                updatedAt: patient.updated_at,
                recentAppointments: appointmentsResult.rows.map(a => ({
                    id: a.id,
                    type: a.appointment_type,
                    title: a.title,
                    startTime: a.start_time,
                    endTime: a.end_time,
                    status: a.status,
                    practitioner: a.practitioner_first_name ?
                        `Dr. ${a.practitioner_first_name} ${a.practitioner_last_name}` : null
                })),
                recentRecords: recordsResult.rows.map(r => ({
                    id: r.id,
                    type: r.record_type,
                    complaint: r.chief_complaint,
                    diagnosis: r.diagnosis,
                    date: r.record_date
                })),
                pendingInvoices: invoicesResult.rows.map(i => ({
                    id: i.id,
                    number: i.invoice_number,
                    total: parseFloat(i.total_amount),
                    paid: parseFloat(i.paid_amount),
                    balance: parseFloat(i.total_amount) - parseFloat(i.paid_amount),
                    status: i.status,
                    date: i.created_at
                }))
            }
        });
    } catch (error) {
        console.error('Get patient error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch patient' });
    }
});

router.post('/', authMiddleware, [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').optional().isEmail().normalizeEmail(),
    body('dateOfBirth').optional().isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const clinicId = req.user.clinicId;
        const {
            firstName, lastName, dateOfBirth, gender, email, phone, mobile,
            address, city, postalCode, country, socialSecurityNumber,
            insuranceProvider, insuranceNumber, emergencyContactName,
            emergencyContactPhone, bloodType, allergies, chronicConditions,
            currentMedications, notes, referralSource
        } = req.body;

        const countResult = await db.query(
            'SELECT COUNT(*) FROM patients WHERE clinic_id = $1',
            [clinicId]
        );
        const patientNumber = `PAT-${String(parseInt(countResult.rows[0].count) + 1).padStart(5, '0')}`;

        const result = await db.query(
            `INSERT INTO patients (
        clinic_id, patient_number, first_name, last_name, date_of_birth, gender,
        email, phone, mobile, address, city, postal_code, country,
        social_security_number, insurance_provider, insurance_number,
        emergency_contact_name, emergency_contact_phone, blood_type,
        allergies, chronic_conditions, current_medications, notes, referral_source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *`,
            [
                clinicId, patientNumber, firstName, lastName, dateOfBirth, gender,
                email, phone, mobile, address, city, postalCode, country || 'France',
                socialSecurityNumber, insuranceProvider, insuranceNumber,
                emergencyContactName, emergencyContactPhone, bloodType,
                allergies, chronicConditions, currentMedications, notes, referralSource
            ]
        );

        const patient = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Patient created successfully',
            data: {
                id: patient.id,
                patientNumber: patient.patient_number,
                firstName: patient.first_name,
                lastName: patient.last_name,
                fullName: `${patient.first_name} ${patient.last_name}`,
                email: patient.email,
                phone: patient.phone
            }
        });
    } catch (error) {
        console.error('Create patient error:', error);
        res.status(500).json({ success: false, message: 'Failed to create patient' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const clinicId = req.user.clinicId;

        const existing = await db.query(
            'SELECT id FROM patients WHERE id = $1 AND clinic_id = $2',
            [id, clinicId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const {
            firstName, lastName, dateOfBirth, gender, email, phone, mobile,
            address, city, postalCode, country, socialSecurityNumber,
            insuranceProvider, insuranceNumber, emergencyContactName,
            emergencyContactPhone, bloodType, allergies, chronicConditions,
            currentMedications, notes, referralSource, isActive
        } = req.body;

        const result = await db.query(
            `UPDATE patients SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        mobile = COALESCE($7, mobile),
        address = COALESCE($8, address),
        city = COALESCE($9, city),
        postal_code = COALESCE($10, postal_code),
        country = COALESCE($11, country),
        social_security_number = COALESCE($12, social_security_number),
        insurance_provider = COALESCE($13, insurance_provider),
        insurance_number = COALESCE($14, insurance_number),
        emergency_contact_name = COALESCE($15, emergency_contact_name),
        emergency_contact_phone = COALESCE($16, emergency_contact_phone),
        blood_type = COALESCE($17, blood_type),
        allergies = COALESCE($18, allergies),
        chronic_conditions = COALESCE($19, chronic_conditions),
        current_medications = COALESCE($20, current_medications),
        notes = COALESCE($21, notes),
        referral_source = COALESCE($22, referral_source),
        is_active = COALESCE($23, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $24 AND clinic_id = $25
      RETURNING *`,
            [
                firstName, lastName, dateOfBirth, gender, email, phone, mobile,
                address, city, postalCode, country, socialSecurityNumber,
                insuranceProvider, insuranceNumber, emergencyContactName,
                emergencyContactPhone, bloodType, allergies, chronicConditions,
                currentMedications, notes, referralSource, isActive, id, clinicId
            ]
        );

        res.json({
            success: true,
            message: 'Patient updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update patient error:', error);
        res.status(500).json({ success: false, message: 'Failed to update patient' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const clinicId = req.user.clinicId;

        const result = await db.query(
            `UPDATE patients SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND clinic_id = $2
       RETURNING id`,
            [id, clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        res.json({ success: true, message: 'Patient deleted successfully' });
    } catch (error) {
        console.error('Delete patient error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete patient' });
    }
});

router.get('/:id/records', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const clinicId = req.user.clinicId;

        const result = await db.query(
            `SELECT mr.*, u.first_name as practitioner_first_name, u.last_name as practitioner_last_name
       FROM medical_records mr
       LEFT JOIN users u ON mr.practitioner_id = u.id
       WHERE mr.patient_id = $1 AND mr.clinic_id = $2
       ORDER BY mr.record_date DESC`,
            [id, clinicId]
        );

        res.json({
            success: true,
            data: result.rows.map(r => ({
                id: r.id,
                type: r.record_type,
                chiefComplaint: r.chief_complaint,
                symptoms: r.symptoms,
                diagnosis: r.diagnosis,
                treatmentPlan: r.treatment_plan,
                prescriptions: r.prescriptions,
                vitalSigns: r.vital_signs,
                notes: r.notes,
                aiSuggestions: r.ai_suggestions,
                isAiAnalyzed: r.is_ai_analyzed,
                recordDate: r.record_date,
                practitioner: r.practitioner_first_name ?
                    `Dr. ${r.practitioner_first_name} ${r.practitioner_last_name}` : null
            }))
        });
    } catch (error) {
        console.error('Get medical records error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch medical records' });
    }
});

router.post('/:id/records', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const clinicId = req.user.clinicId;
        const practitionerId = req.user.id;

        const {
            recordType, chiefComplaint, symptoms, diagnosis, treatmentPlan,
            prescriptions, vitalSigns, notes
        } = req.body;

        const result = await db.query(
            `INSERT INTO medical_records (
        patient_id, clinic_id, practitioner_id, record_type,
        chief_complaint, symptoms, diagnosis, treatment_plan,
        prescriptions, vital_signs, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
            [
                id, clinicId, practitionerId, recordType || 'consultation',
                chiefComplaint, symptoms, diagnosis, treatmentPlan,
                JSON.stringify(prescriptions || []), JSON.stringify(vitalSigns || {}), notes
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Medical record created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create medical record error:', error);
        res.status(500).json({ success: false, message: 'Failed to create medical record' });
    }
});

module.exports = router;
