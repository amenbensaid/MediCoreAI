const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getRequestedPractitionerScope } = require('../utils/staffScope');
const { createClinicAdminNotification, createPlatformAdminNotification } = require('../services/notificationCenter');

const router = express.Router();

const normalizeListField = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
    return [];
};

const buildAnimalPayload = (row) => ({
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed || '',
    color: row.color || '',
    weight: row.weight ? Number(row.weight) : null,
    gender: row.gender || '',
    dateOfBirth: row.date_of_birth,
    microchipNumber: row.microchip_number || '',
    tattooNumber: row.tattoo_number || '',
    insuranceProvider: row.insurance_provider || '',
    insuranceNumber: row.insurance_number || '',
    allergies: row.allergies || [],
    chronicConditions: row.chronic_conditions || [],
    notes: row.notes || '',
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerId: row.owner_id || row.patient_id || null,
    ownerName: row.owner_first_name && row.owner_last_name
        ? `${row.owner_first_name} ${row.owner_last_name}`
        : null,
    ownerEmail: row.owner_email || null,
    ownerPhone: row.owner_phone || null
});

const getValidationMessage = (req) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return null;
    return errors.array()[0]?.msg || 'Invalid request';
};

router.get('/overview', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;

        const [speciesResult, activeAnimalsResult, remindersResult, urgentResult] = await Promise.all([
            db.query(
                `SELECT
                    COUNT(*) FILTER (WHERE LOWER(species) LIKE 'chien%' OR LOWER(species) LIKE 'dog%')::int AS dogs,
                    COUNT(*) FILTER (WHERE LOWER(species) LIKE 'chat%' OR LOWER(species) LIKE 'cat%')::int AS cats,
                    COUNT(*) FILTER (
                        WHERE LOWER(species) NOT LIKE 'chien%'
                          AND LOWER(species) NOT LIKE 'dog%'
                          AND LOWER(species) NOT LIKE 'chat%'
                          AND LOWER(species) NOT LIKE 'cat%'
                          AND LOWER(species) NOT LIKE 'cheval%'
                          AND LOWER(species) NOT LIKE 'equid%'
                    )::int AS nac,
                    COUNT(*) FILTER (WHERE LOWER(species) LIKE 'cheval%' OR LOWER(species) LIKE 'equid%')::int AS equines,
                    COUNT(*)::int AS total
                 FROM animals
                 WHERE clinic_id = $1 AND is_active = true`,
                [clinicId]
            ),
            db.query(
                `SELECT
                    a.id,
                    a.name,
                    a.species,
                    a.breed,
                    a.created_at,
                    p.first_name,
                    p.last_name,
                    MAX(v.next_due_date) FILTER (WHERE v.next_due_date >= CURRENT_DATE) AS next_due_date,
                    BOOL_OR(
                        ap.start_time >= NOW() - INTERVAL '1 day'
                        AND (
                            LOWER(COALESCE(ap.appointment_type, '')) LIKE '%urgent%'
                            OR LOWER(COALESCE(ap.appointment_type, '')) LIKE '%emerg%'
                            OR LOWER(COALESCE(ap.title, '')) LIKE '%urgent%'
                            OR LOWER(COALESCE(ap.title, '')) LIKE '%emerg%'
                        )
                    ) AS has_emergency,
                    COUNT(v.id)::int AS vaccine_count
                 FROM animals a
                 LEFT JOIN patients p ON a.patient_id = p.id
                 LEFT JOIN vaccinations v ON v.animal_id = a.id
                 LEFT JOIN appointments ap ON ap.animal_id = a.id
                 WHERE a.clinic_id = $1 AND a.is_active = true
                 GROUP BY a.id, a.name, a.species, a.breed, a.created_at, p.first_name, p.last_name
                 ORDER BY a.created_at DESC, a.name ASC
                 LIMIT 8`,
                [clinicId]
            ),
            db.query(
                `SELECT
                    v.id,
                    a.name AS animal_name,
                    v.vaccine_name,
                    v.next_due_date
                 FROM vaccinations v
                 INNER JOIN animals a ON a.id = v.animal_id
                 WHERE v.clinic_id = $1
                   AND a.is_active = true
                   AND v.next_due_date IS NOT NULL
                   AND v.next_due_date >= CURRENT_DATE
                   AND v.next_due_date <= CURRENT_DATE + INTERVAL '30 days'
                 ORDER BY v.next_due_date ASC, a.name ASC
                 LIMIT 5`,
                [clinicId]
            ),
            db.query(
                `SELECT
                    a.id,
                    a.name,
                    a.breed,
                    a.species,
                    ap.title,
                    ap.appointment_type,
                    ap.start_time
                 FROM appointments ap
                 INNER JOIN animals a ON a.id = ap.animal_id
                 WHERE ap.clinic_id = $1
                   AND ap.start_time >= NOW() - INTERVAL '1 day'
                   AND (
                       LOWER(COALESCE(ap.appointment_type, '')) LIKE '%urgent%'
                       OR LOWER(COALESCE(ap.appointment_type, '')) LIKE '%emerg%'
                       OR LOWER(COALESCE(ap.title, '')) LIKE '%urgent%'
                       OR LOWER(COALESCE(ap.title, '')) LIKE '%emerg%'
                   )
                 ORDER BY ap.start_time ASC
                 LIMIT 1`,
                [clinicId]
            )
        ]);

        const species = speciesResult.rows[0] || {};
        const urgentCase = urgentResult.rows[0] || null;

        res.json({
            success: true,
            data: {
                stats: {
                    dogs: species.dogs || 0,
                    cats: species.cats || 0,
                    nac: species.nac || 0,
                    equines: species.equines || 0,
                    emergencies: urgentCase ? 1 : 0,
                    total: species.total || 0
                },
                activePatients: activeAnimalsResult.rows.map((row) => {
                    let status = 'Healthy';

                    if (row.has_emergency) {
                        status = 'Emergency';
                    } else if (row.next_due_date) {
                        const dueDate = new Date(row.next_due_date);
                        const warningThreshold = new Date();
                        warningThreshold.setDate(warningThreshold.getDate() + 30);
                        if (dueDate <= warningThreshold) {
                            status = 'Follow-up';
                        }
                    }

                    return {
                        id: row.id,
                        name: row.name,
                        species: row.species,
                        breed: row.breed,
                        ownerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
                        nextVaccine: row.next_due_date,
                        vaccineCount: row.vaccine_count || 0,
                        status
                    };
                }),
                reminders: remindersResult.rows.map((row) => ({
                    id: row.id,
                    animalName: row.animal_name,
                    vaccineName: row.vaccine_name,
                    nextDueDate: row.next_due_date
                })),
                urgentCase: urgentCase ? {
                    id: urgentCase.id,
                    name: urgentCase.name,
                    breed: urgentCase.breed,
                    species: urgentCase.species,
                    reason: urgentCase.title || urgentCase.appointment_type || 'Urgence en cours',
                    startTime: urgentCase.start_time
                } : null
            }
        });
    } catch (error) {
        console.error('Failed to fetch animals overview:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch animals overview' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search = '', species = 'all', isActive = 'true' } = req.query;
        const params = [req.user.clinicId];
        let whereClause = 'WHERE a.clinic_id = $1';
        let paramIndex = 2;
        const practitionerScopeId = getRequestedPractitionerScope(req);

        if (practitionerScopeId) {
            whereClause += ` AND (
                p.primary_practitioner_id = $${paramIndex}
                OR EXISTS (
                    SELECT 1 FROM appointments scoped_apt
                    WHERE scoped_apt.animal_id = a.id
                      AND scoped_apt.practitioner_id = $${paramIndex}
                )
            )`;
            params.push(practitionerScopeId);
            paramIndex++;
        }

        if (isActive !== 'all') {
            whereClause += ` AND a.is_active = $${paramIndex}`;
            params.push(isActive === 'true');
            paramIndex++;
        }

        if (species && species !== 'all') {
            whereClause += ` AND LOWER(a.species) = LOWER($${paramIndex})`;
            params.push(species);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (
                LOWER(a.name) LIKE LOWER($${paramIndex})
                OR LOWER(a.species) LIKE LOWER($${paramIndex})
                OR LOWER(a.breed) LIKE LOWER($${paramIndex})
                OR LOWER(a.microchip_number) LIKE LOWER($${paramIndex})
                OR LOWER(p.first_name) LIKE LOWER($${paramIndex})
                OR LOWER(p.last_name) LIKE LOWER($${paramIndex})
                OR LOWER(p.email) LIKE LOWER($${paramIndex})
            )`;
            params.push(`%${search}%`);
        }

        const result = await db.query(
            `SELECT a.id, a.patient_id, a.name, a.species, a.breed, a.color, a.weight, a.gender,
                    a.date_of_birth, a.microchip_number, a.tattoo_number, a.insurance_provider,
                    a.insurance_number, a.allergies, a.chronic_conditions, a.notes, a.is_active,
                    a.created_at, a.updated_at,
                    p.id AS owner_id, p.first_name AS owner_first_name, p.last_name AS owner_last_name,
                    p.email AS owner_email, p.phone AS owner_phone
             FROM animals a
             LEFT JOIN patients p ON a.patient_id = p.id
             ${whereClause}
             ORDER BY a.created_at DESC, a.name ASC`,
            params
        );

        res.json({
            success: true,
            data: result.rows.map(buildAnimalPayload)
        });
    } catch (error) {
        console.error('Failed to fetch animals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch animals' });
    }
});

router.post('/', authMiddleware, [
    body('name').trim().notEmpty().withMessage('Animal name is required'),
    body('species').trim().notEmpty().withMessage('Species is required'),
    body('patientId').optional({ values: 'falsy' }).isUUID().withMessage('Invalid owner'),
    body('weight').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Invalid weight'),
    body('dateOfBirth').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date of birth')
], async (req, res) => {
    const message = getValidationMessage(req);
    if (message) return res.status(400).json({ success: false, message });

    try {
        const clinicId = req.user.clinicId;
        const {
            patientId, name, species, breed, color, dateOfBirth, gender, weight,
            microchipNumber, tattooNumber, insuranceProvider, insuranceNumber,
            allergies, chronicConditions, notes
        } = req.body;

        if (patientId) {
            const owner = await db.query('SELECT id FROM patients WHERE id = $1 AND clinic_id = $2', [patientId, clinicId]);
            if (owner.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Owner patient not found' });
            }
        }

        const result = await db.query(
            `INSERT INTO animals (
                patient_id, clinic_id, name, species, breed, color, date_of_birth, gender,
                weight, microchip_number, tattoo_number, insurance_provider, insurance_number,
                allergies, chronic_conditions, notes
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            RETURNING *`,
            [
                patientId || null,
                clinicId,
                name,
                species,
                breed || null,
                color || null,
                dateOfBirth || null,
                gender || null,
                weight || null,
                microchipNumber || null,
                tattooNumber || null,
                insuranceProvider || null,
                insuranceNumber || null,
                normalizeListField(allergies),
                normalizeListField(chronicConditions),
                notes || null
            ]
        );

        const animal = result.rows[0];
        createClinicAdminNotification({
            clinicId,
            type: 'success',
            title: 'Nouvel animal',
            message: `${animal.name} (${animal.species}) a été ajouté au dossier vétérinaire.`,
            url: '/animals',
            metadata: { animalId: animal.id, patientId: patientId || null, event: 'animal_created' },
            excludeUserId: req.user.id
        }).catch((error) => console.error('Failed to notify clinic admins:', error));

        createPlatformAdminNotification({
            type: 'info',
            title: 'Nouvel animal vétérinaire',
            message: `${animal.name} (${animal.species}) a été ajouté dans une clinique.`,
            url: '/animals',
            metadata: { animalId: animal.id, clinicId, patientId: patientId || null, event: 'animal_created' }
        }).catch((error) => console.error('Failed to notify platform admins:', error));

        res.status(201).json({ success: true, data: buildAnimalPayload(animal) });
    } catch (error) {
        console.error('Failed to create animal:', error);
        res.status(500).json({ success: false, message: 'Failed to create animal' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;
        const {
            patientId, name, species, breed, color, dateOfBirth, gender, weight,
            microchipNumber, tattooNumber, insuranceProvider, insuranceNumber,
            allergies, chronicConditions, notes, isActive
        } = req.body;

        if (patientId) {
            const owner = await db.query('SELECT id FROM patients WHERE id = $1 AND clinic_id = $2', [patientId, clinicId]);
            if (owner.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Owner patient not found' });
            }
        }

        const result = await db.query(
            `UPDATE animals SET
                patient_id = COALESCE($1, patient_id),
                name = COALESCE($2, name),
                species = COALESCE($3, species),
                breed = COALESCE($4, breed),
                color = COALESCE($5, color),
                date_of_birth = COALESCE($6, date_of_birth),
                gender = COALESCE($7, gender),
                weight = COALESCE($8, weight),
                microchip_number = COALESCE($9, microchip_number),
                tattoo_number = COALESCE($10, tattoo_number),
                insurance_provider = COALESCE($11, insurance_provider),
                insurance_number = COALESCE($12, insurance_number),
                allergies = COALESCE($13, allergies),
                chronic_conditions = COALESCE($14, chronic_conditions),
                notes = COALESCE($15, notes),
                is_active = COALESCE($16, is_active),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $17 AND clinic_id = $18
             RETURNING *`,
            [
                patientId || null,
                name || null,
                species || null,
                breed ?? null,
                color ?? null,
                dateOfBirth || null,
                gender ?? null,
                weight || null,
                microchipNumber ?? null,
                tattooNumber ?? null,
                insuranceProvider ?? null,
                insuranceNumber ?? null,
                allergies !== undefined ? normalizeListField(allergies) : null,
                chronicConditions !== undefined ? normalizeListField(chronicConditions) : null,
                notes ?? null,
                typeof isActive === 'boolean' ? isActive : null,
                req.params.id,
                clinicId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Animal not found' });
        }

        res.json({ success: true, data: buildAnimalPayload(result.rows[0]) });
    } catch (error) {
        console.error('Failed to update animal:', error);
        res.status(500).json({ success: false, message: 'Failed to update animal' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE animals SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND clinic_id = $2
             RETURNING id`,
            [req.params.id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Animal not found' });
        }

        res.json({ success: true, message: 'Animal disabled' });
    } catch (error) {
        console.error('Failed to delete animal:', error);
        res.status(500).json({ success: false, message: 'Failed to delete animal' });
    }
});

module.exports = router;
