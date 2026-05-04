const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require('path');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { cancelGoogleEvent } = require('../services/googleCalendar');
const { createJitsiMeeting, updateJitsiMeeting } = require('../services/jitsi');
const { createNotification } = require('../services/notificationCenter');
const { normalizeCalendarPreferences, timeToMinutes } = require('../utils/calendarPreferences');
const { formatLocalDateTime } = require('../utils/dateTime');
const { buildUploadUrl, resolveStoredUploadUrl } = require('../utils/uploads');
const { getRequestedPractitionerScope, getWritablePractitionerId, isClinicAdminUser } = require('../utils/staffScope');

const router = express.Router();

const buildMeetingPayload = (appointment) => {
    const isOnline = appointment.consultation_mode === 'online';
    const status = appointment.status || 'scheduled';
    const hasMeetLink = Boolean(appointment.meet_link);
    const storedMeetingStatus = appointment.meeting_status || 'pending';
    const canExposeMeeting = ['confirmed', 'in_progress', 'completed'].includes(status);

    return {
        provider: isOnline ? (appointment.meeting_provider || 'jitsi') : null,
        status: !isOnline
            ? 'not_required'
            : status === 'cancelled'
                ? 'cancelled'
                : status === 'completed'
                    ? 'completed'
                : status === 'scheduled'
                    ? 'awaiting_approval'
                : hasMeetLink && storedMeetingStatus !== 'pending'
                    ? 'ready'
                    : storedMeetingStatus,
        joinUrl: isOnline && canExposeMeeting ? appointment.meet_link : null,
        createdAt: appointment.meeting_created_at,
        lastSyncAt: appointment.meeting_last_sync_at
    };
};

const buildAppointmentResponse = (appointment) => ({
    id: appointment.id,
    patientId: appointment.patient_id,
    title: appointment.title,
    type: appointment.appointment_type,
    start: formatLocalDateTime(appointment.start_time),
    end: formatLocalDateTime(appointment.end_time),
    status: appointment.status,
    room: appointment.room,
    color: appointment.color,
    notes: appointment.notes,
    reasonCategory: appointment.reason_category,
    reasonDetail: appointment.reason_detail,
    preparationNotes: appointment.preparation_notes,
    medicalRecordId: appointment.medical_record_id,
    requestedDocuments: appointment.requested_documents || [],
    sharedDocumentsCount: Number(appointment.shared_documents_count || 0),
    consultationMode: appointment.consultation_mode,
    meetLink: appointment.meet_link,
    googleEventId: appointment.google_event_id,
    meeting: buildMeetingPayload(appointment)
});

const hasOverlap = async ({ client, practitionerId, startTime, endTime, clinicId, excludeId = null }) => {
    if (!practitionerId || !startTime || !endTime) {
        return false;
    }

    const params = [clinicId, practitionerId, startTime, endTime];
    let excludeClause = '';

    if (excludeId) {
        params.push(excludeId);
        excludeClause = `AND id != $${params.length}`;
    }

    const result = await client.query(
        `SELECT id
         FROM appointments
         WHERE clinic_id = $1
           AND practitioner_id = $2
           AND status NOT IN ('cancelled')
           AND tstzrange(start_time, end_time, '[)') && tstzrange($3::timestamp, $4::timestamp, '[)')
           ${excludeClause}
         LIMIT 1`,
        params
    );

    return result.rows.length > 0;
};

const isModeAllowedBySession = (sessionMode, requestedMode) => (
    sessionMode === 'both' || sessionMode === requestedMode
);

const validateWithinPractitionerCalendar = async ({ client, practitionerId, startTime, endTime, consultationMode }) => {
    const practitionerResult = await client.query(
        `SELECT accepts_online, calendar_preferences
         FROM users
         WHERE id = $1 AND role = 'practitioner' AND is_active = true`,
        [practitionerId]
    );

    if (practitionerResult.rows.length === 0) {
        return 'Practitioner not found or inactive';
    }

    const practitioner = practitionerResult.rows[0];
    const mode = consultationMode === 'online' ? 'online' : 'in-person';
    if (mode === 'online' && !practitioner.accepts_online) {
        return 'This practitioner does not offer online consultations';
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const calendar = normalizeCalendarPreferences(practitioner.calendar_preferences);
    const matchingSession = calendar.sessions.find((session) => (
        session.enabled &&
        session.dayOfWeek === start.getDay() &&
        isModeAllowedBySession(session.mode, mode) &&
        startMinutes >= timeToMinutes(session.start) &&
        startMinutes + durationMinutes <= timeToMinutes(session.end)
    ));

    return matchingSession ? null : 'Selected time is outside the practitioner calendar sessions for this consultation mode';
};

const syncGoogleMeetForAppointment = async ({ appointment, client = db }) => {
    if (appointment.consultation_mode !== 'online') {
        const error = new Error('This appointment is not an online consultation');
        error.statusCode = 400;
        throw error;
    }

    if (appointment.status === 'cancelled') {
        const error = new Error('Cancelled appointments cannot be synchronized');
        error.statusCode = 400;
        throw error;
    }

    if (appointment.status !== 'confirmed') {
        const error = new Error('Confirm this appointment before creating the Jitsi Meet link');
        error.statusCode = 400;
        throw error;
    }

    const event = appointment.google_event_id
        ? updateJitsiMeeting({
            appointmentId: appointment.id,
            practitionerId: appointment.practitioner_id,
            startTime: appointment.start_time,
            existingExternalId: appointment.google_event_id
        })
        : createJitsiMeeting({
            appointmentId: appointment.id,
            practitionerId: appointment.practitioner_id,
            startTime: appointment.start_time
        });

    const result = await client.query(
        `UPDATE appointments
         SET meet_link = $1,
             google_event_id = $2,
             meeting_provider = 'jitsi',
             meeting_status = $3,
             meeting_created_at = COALESCE(meeting_created_at, CURRENT_TIMESTAMP),
             meeting_last_sync_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [
            event.meetLink || appointment.meet_link || null,
            event.googleEventId || appointment.google_event_id || null,
            event.meetLink || appointment.meet_link ? 'ready' : 'pending',
            appointment.id
        ]
    );

    return result.rows[0];
};

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, patientId, status, search = '', page = 1, limit = 50 } = req.query;
        const clinicId = req.user.clinicId;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE a.clinic_id = $1';
        const params = [clinicId];
        let paramIndex = 2;
        const practitionerScopeId = getRequestedPractitionerScope(req);

        if (practitionerScopeId) {
            whereClause += ` AND a.practitioner_id = $${paramIndex++}`;
            params.push(practitionerScopeId);
        }

        if (startDate) {
            whereClause += ` AND a.start_time >= $${paramIndex++}`;
            params.push(startDate);
        }
        if (endDate) {
            whereClause += ` AND a.start_time <= $${paramIndex++}`;
            params.push(endDate);
        }
        if (patientId) {
            whereClause += ` AND a.patient_id = $${paramIndex++}`;
            params.push(patientId);
        }
        if (status) {
            whereClause += ` AND a.status = $${paramIndex++}`;
            params.push(status);
        }
        if (search) {
            whereClause += ` AND (
                LOWER(p.first_name) LIKE LOWER($${paramIndex}) OR
                LOWER(p.last_name) LIKE LOWER($${paramIndex}) OR
                LOWER(p.email) LIKE LOWER($${paramIndex}) OR
                p.phone LIKE $${paramIndex} OR
                LOWER(a.appointment_type) LIKE LOWER($${paramIndex}) OR
                LOWER(a.status) LIKE LOWER($${paramIndex})
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const result = await db.query(
            `SELECT a.*, p.first_name, p.last_name, p.phone, p.email, p.avatar_url,
              (
                SELECT COUNT(*)
                FROM patient_documents pd
                WHERE pd.patient_id = a.patient_id
                  AND (pd.appointment_id = a.id OR pd.appointment_access_id = a.id)
              ) AS shared_documents_count,
              u.first_name as dr_first, u.last_name as dr_last
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.practitioner_id = u.id
       ${whereClause}
       ORDER BY a.start_time ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        const formatted = result.rows.map(a => ({
            ...buildAppointmentResponse(a),
            patient: a.first_name ? {
                firstName: a.first_name,
                lastName: a.last_name,
                fullName: `${a.first_name} ${a.last_name}`,
                phone: a.phone,
                email: a.email,
                avatarUrl: a.avatar_url
            } : null,
            practitioner: a.dr_first ? {
                fullName: `Dr. ${a.dr_first} ${a.dr_last}`
            } : null
        }));
        res.json({ success: true, data: { appointments: formatted } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
});

router.get('/calendar', authMiddleware, async (req, res) => {
    try {
        const { start, end } = req.query;
        const clinicId = req.user.clinicId;
        const params = [clinicId, start, end];
        let practitionerClause = '';
        const practitionerScopeId = getRequestedPractitionerScope(req);
        if (practitionerScopeId) {
            params.push(practitionerScopeId);
            practitionerClause = `AND a.practitioner_id = $${params.length}`;
        }

        const result = await db.query(
            `SELECT a.id, a.title, a.appointment_type, a.start_time, a.end_time,
              a.status, a.room, a.color, a.notes, a.reason_category, a.reason_detail,
              a.preparation_notes, a.requested_documents, a.consultation_mode, a.meet_link,
              a.google_event_id, a.meeting_provider, a.meeting_status,
              a.meeting_created_at, a.meeting_last_sync_at, p.first_name, p.last_name, p.avatar_url,
              (
                SELECT COUNT(*)
                FROM patient_documents pd
                WHERE pd.patient_id = a.patient_id
                  AND (pd.appointment_id = a.id OR pd.appointment_access_id = a.id)
              ) AS shared_documents_count
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       WHERE a.clinic_id = $1 AND a.start_time >= $2 AND a.start_time <= $3 ${practitionerClause}
       ORDER BY a.start_time ASC`,
            params
        );

        res.json({
            success: true,
            data: result.rows.map(a => ({
                id: a.id,
                title: a.title || `${a.first_name} ${a.last_name}`,
                patientName: `${a.first_name} ${a.last_name}`,
                patientAvatarUrl: a.avatar_url,
                type: a.appointment_type,
                start: formatLocalDateTime(a.start_time),
                end: formatLocalDateTime(a.end_time),
                status: a.status,
                color: a.color || '#3B82F6',
                notes: a.notes,
                reasonCategory: a.reason_category,
                reasonDetail: a.reason_detail,
                preparationNotes: a.preparation_notes,
                requestedDocuments: a.requested_documents || [],
                sharedDocumentsCount: Number(a.shared_documents_count || 0),
                consultationMode: a.consultation_mode,
                meetLink: a.meet_link,
                meeting: buildMeetingPayload(a)
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch calendar' });
    }
});

router.post('/', authMiddleware, [
    body('patientId').isUUID(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
    body('appointmentType').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { patientId, practitionerId, appointmentType, title, description,
            startTime, endTime, durationMinutes, room, color, notes, consultationMode,
            reasonCategory, reasonDetail } = req.body;
        const resolvedPractitionerId = getWritablePractitionerId(req, req.body);
        if (!resolvedPractitionerId) {
            return res.status(400).json({ success: false, message: 'Practitioner is required' });
        }
        if (isClinicAdminUser(req.user) && practitionerId) {
            const practitionerResult = await db.query(
                `SELECT u.id
                 FROM users u
                 JOIN user_clinics uc ON uc.user_id = u.id
                 WHERE u.id = $1 AND uc.clinic_id = $2 AND u.role = 'practitioner' AND u.is_active = true`,
                [practitionerId, req.user.clinicId]
            );
            if (practitionerResult.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Practitioner not found' });
            }
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        const mode = consultationMode || 'in-person';

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return res.status(400).json({ success: false, message: 'Invalid appointment time range' });
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const conflict = await hasOverlap({
                client,
                practitionerId: resolvedPractitionerId,
                startTime,
                endTime,
                clinicId: req.user.clinicId
            });

            if (conflict) {
                await client.query('ROLLBACK');
                return res.status(409).json({ success: false, message: 'Practitioner already has an appointment in this time slot' });
            }

            const calendarError = await validateWithinPractitionerCalendar({
                client,
                practitionerId: resolvedPractitionerId,
                startTime,
                endTime,
                consultationMode: mode
            });

            if (calendarError) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: calendarError });
            }

            let meetLink = null;
            let googleEventId = null;
            let meetingProvider = null;
            let meetingStatus = mode === 'online' ? 'awaiting_approval' : 'not_required';
            let meetingCreatedAt = null;
            let meetingLastSyncAt = null;
            const meetingWarning = mode === 'online'
                ? 'Online appointment created. Confirm it to create and share the Jitsi Meet link.'
                : null;
            if (mode === 'online') {
                meetingProvider = 'jitsi';
            }

            const result = await client.query(
                `INSERT INTO appointments (clinic_id, patient_id, practitioner_id, appointment_type,
            title, description, start_time, end_time, duration_minutes, room, color, notes, consultation_mode,
            reason_category, reason_detail, meet_link, google_event_id,
            meeting_provider, meeting_status, meeting_created_at, meeting_last_sync_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           RETURNING *`,
                [req.user.clinicId, patientId, resolvedPractitionerId, appointmentType,
                    title, description, startTime, endTime, durationMinutes || 30, room, color, notes, mode,
                    reasonCategory || null, reasonDetail || null, meetLink, googleEventId,
                    meetingProvider, meetingStatus, meetingCreatedAt, meetingLastSyncAt]
            );

            await client.query(
                `UPDATE patients
                 SET primary_practitioner_id = COALESCE(primary_practitioner_id, $1),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 AND clinic_id = $3`,
                [resolvedPractitionerId, patientId, req.user.clinicId]
            );

            await client.query('COMMIT');
            res.status(201).json({
                success: true,
                message: meetingWarning || 'Appointment created successfully',
                data: buildAppointmentResponse(result.rows[0])
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create appointment' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            patientId, appointmentType, title, startTime, endTime, status, room, notes, consultationMode,
            reasonCategory, reasonDetail, preparationNotes, requestedDocuments, createMedicalRecord, medicalRecord
        } = req.body;
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const currentResult = await client.query(
                `SELECT a.id, a.practitioner_id, a.start_time, a.end_time, a.patient_id, a.appointment_type, a.title,
                        a.description, a.notes, a.consultation_mode, a.meet_link, a.google_event_id, a.status,
                        a.meeting_provider, a.meeting_status, a.meeting_created_at, a.meeting_last_sync_at,
                        a.reason_category, a.reason_detail, a.preparation_notes, a.medical_record_id,
                        p.email, p.first_name, p.last_name
                 FROM appointments a
                 LEFT JOIN patients p ON a.patient_id = p.id
                 WHERE a.id = $1 AND a.clinic_id = $2`,
                [id, req.user.clinicId]
            );

            if (currentResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Appointment not found' });
            }

            const current = currentResult.rows[0];
            const nextStartTime = startTime || current.start_time;
            const nextEndTime = endTime || current.end_time;
            const nextConsultationMode = consultationMode || current.consultation_mode;
            const nextStatus = status || current.status;
            const start = new Date(nextStartTime);
            const end = new Date(nextEndTime);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Invalid appointment time range' });
            }

            const conflict = await hasOverlap({
                client,
                practitionerId: current.practitioner_id,
                startTime: nextStartTime,
                endTime: nextEndTime,
                clinicId: req.user.clinicId,
                excludeId: id
            });

            if (conflict) {
                await client.query('ROLLBACK');
                return res.status(409).json({ success: false, message: 'Practitioner already has an appointment in this time slot' });
            }

            const calendarError = await validateWithinPractitionerCalendar({
                client,
                practitionerId: current.practitioner_id,
                startTime: nextStartTime,
                endTime: nextEndTime,
                consultationMode: nextConsultationMode
            });

            if (calendarError) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: calendarError });
            }

            let patient = {
                email: current.email,
                first_name: current.first_name,
                last_name: current.last_name
            };
            if (patientId && patientId !== current.patient_id) {
                const patientResult = await client.query(
                    'SELECT email, first_name, last_name FROM patients WHERE id = $1 AND clinic_id = $2',
                    [patientId, req.user.clinicId]
                );
                patient = patientResult.rows[0] || patient;
            }

            let nextMeetLink = current.meet_link;
            let nextGoogleEventId = current.google_event_id;
            let nextMeetingProvider = nextConsultationMode === 'online' ? 'jitsi' : null;
            const shouldHaveMeeting = nextConsultationMode === 'online' && nextStatus === 'confirmed';
            let nextMeetingStatus = nextConsultationMode === 'online'
                ? shouldHaveMeeting
                    ? (current.meeting_status === 'ready' || current.meet_link ? 'ready' : 'pending')
                    : nextStatus === 'completed'
                        ? 'completed'
                    : nextStatus === 'cancelled'
                        ? 'cancelled'
                        : 'awaiting_approval'
                : 'not_required';
            let nextMeetingCreatedAt = null;
            let nextMeetingLastSyncAt = null;
            let createdMedicalRecordId = current.medical_record_id || null;
            const meetingWarning = shouldHaveMeeting && !current.meet_link
                ? 'Appointment confirmed. The Jitsi Meet link is now available.'
                : null;

            if (shouldHaveMeeting) {
                if (current.google_event_id && current.meeting_provider === 'jitsi') {
                    const updatedEvent = updateJitsiMeeting({
                        appointmentId: current.id,
                        practitionerId: current.practitioner_id,
                        startTime: nextStartTime,
                        existingExternalId: current.google_event_id
                    });
                    nextMeetLink = updatedEvent.meetingUrl || current.meet_link;
                    nextGoogleEventId = updatedEvent.externalId || current.google_event_id;
                } else {
                    const createdEvent = createJitsiMeeting({
                        appointmentId: current.id,
                        practitionerId: current.practitioner_id,
                        startTime: nextStartTime
                    });
                    nextMeetLink = createdEvent.meetingUrl;
                    nextGoogleEventId = createdEvent.externalId;
                    nextMeetingCreatedAt = new Date();
                }
                nextMeetingProvider = 'jitsi';
                nextMeetingStatus = nextMeetLink ? 'ready' : 'pending';
                nextMeetingLastSyncAt = new Date();
            } else if (current.google_event_id) {
                if (current.meeting_provider === 'google_meet') {
                    try {
                        await cancelGoogleEvent({
                            practitionerId: current.practitioner_id,
                            googleEventId: current.google_event_id
                        });
                    } catch (error) {
                        console.error('Failed to cancel linked Google event before appointment update', {
                            appointmentId: id,
                            googleEventId: current.google_event_id,
                            message: error.message
                        });
                    }
                }
                nextMeetLink = null;
                nextGoogleEventId = null;
                nextMeetingProvider = nextConsultationMode === 'online' ? 'jitsi' : null;
                nextMeetingStatus = nextConsultationMode === 'online'
                    ? nextStatus === 'cancelled' ? 'cancelled' : 'awaiting_approval'
                    : 'not_required';
                nextMeetingLastSyncAt = new Date();
            }

            if (createMedicalRecord && !createdMedicalRecordId) {
                const recordResult = await client.query(
                    `INSERT INTO medical_records (
                        patient_id, clinic_id, practitioner_id, record_type,
                        chief_complaint, symptoms, diagnosis, treatment_plan,
                        prescriptions, vital_signs, notes
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, '{}'::jsonb, $9)
                    RETURNING id`,
                    [
                        patientId || current.patient_id,
                        req.user.clinicId,
                        req.user.id,
                        medicalRecord?.recordType || 'pre_consultation',
                        medicalRecord?.chiefComplaint || reasonDetail || reasonCategory || current.appointment_type,
                        medicalRecord?.symptoms || notes || current.notes || '',
                        medicalRecord?.diagnosis || '',
                        medicalRecord?.treatmentPlan || '',
                        medicalRecord?.notes || preparationNotes || ''
                    ]
                );
                createdMedicalRecordId = recordResult.rows[0]?.id || null;
            }

            const result = await client.query(
                `UPDATE appointments SET
            patient_id = COALESCE($1, patient_id),
            appointment_type = COALESCE($2, appointment_type),
            title = COALESCE($3, title),
            start_time = COALESCE($4, start_time),
            end_time = COALESCE($5, end_time),
            status = COALESCE($6, status),
            room = COALESCE($7, room),
            notes = COALESCE($8, notes),
            consultation_mode = COALESCE($9, consultation_mode),
            reason_category = COALESCE($10, reason_category),
            reason_detail = COALESCE($11, reason_detail),
            preparation_notes = COALESCE($12, preparation_notes),
            medical_record_id = COALESCE($13, medical_record_id),
            requested_documents = COALESCE($14, requested_documents),
            meet_link = $15,
            google_event_id = $16,
            meeting_provider = $17,
            meeting_status = $18,
            meeting_created_at = COALESCE($19, meeting_created_at),
            meeting_last_sync_at = COALESCE($20, meeting_last_sync_at),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $21 AND clinic_id = $22
           RETURNING *`,
                [
                    patientId, appointmentType, title, startTime, endTime, status, room, notes,
                    consultationMode, reasonCategory, reasonDetail, preparationNotes, createdMedicalRecordId,
                    Array.isArray(requestedDocuments) ? JSON.stringify(requestedDocuments) : null,
                    nextMeetLink, nextGoogleEventId, nextMeetingProvider,
                    nextMeetingStatus, nextMeetingCreatedAt, nextMeetingLastSyncAt, id, req.user.clinicId
                ]
            );

            await client.query('COMMIT');
            const savedAppointment = result.rows[0];
            const requestedDocumentsList = Array.isArray(requestedDocuments) ? requestedDocuments : [];
            if (nextStatus === 'confirmed' || requestedDocumentsList.length > 0) {
                createNotification({
                    clinicId: req.user.clinicId,
                    patientId: savedAppointment.patient_id,
                    type: 'appointment',
                    title: nextStatus === 'confirmed' ? 'Rendez-vous confirmé' : 'Documents demandés',
                    message: requestedDocumentsList.length > 0
                        ? `Votre médecin demande: ${requestedDocumentsList.join(', ')}`
                        : 'Votre rendez-vous a été confirmé par le médecin.',
                    url: '/patient/portal',
                    metadata: { appointmentId: savedAppointment.id }
                }).catch(() => {});
            }

            res.json({
                success: true,
                message: meetingWarning || 'Appointment updated successfully',
                data: buildAppointmentResponse(savedAppointment)
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update appointment' });
    }
});

router.post('/:id/sync-meeting', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const params = [id, req.user.clinicId];
        let practitionerClause = '';

        if (req.user.role === 'practitioner') {
            params.push(req.user.id);
            practitionerClause = `AND a.practitioner_id = $${params.length}`;
        }

        const appointmentResult = await db.query(
            `SELECT a.*, p.email, p.first_name, p.last_name
             FROM appointments a
             LEFT JOIN patients p ON a.patient_id = p.id
             WHERE a.id = $1 AND a.clinic_id = $2 ${practitionerClause}`,
            params
        );

        if (appointmentResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const appointment = appointmentResult.rows[0];
        try {
            const synced = await syncGoogleMeetForAppointment({ appointment });
            return res.json({
                success: true,
                message: synced.meet_link ? 'Jitsi Meet link synchronized' : 'Meeting synchronization is pending',
                data: buildAppointmentResponse(synced)
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({ success: false, message: error.message });
            }

            throw error;
        }
    } catch (error) {
        console.error('Failed to synchronize Jitsi Meet link', error);
        res.status(500).json({ success: false, message: 'Failed to synchronize Jitsi Meet link' });
    }
});

router.get('/:id/documents', authMiddleware, async (req, res) => {
    try {
        const appointmentResult = await db.query(
            `SELECT id, patient_id, practitioner_id, clinic_id
             FROM appointments
             WHERE id = $1 AND clinic_id = $2`,
            [req.params.id, req.user.clinicId]
        );

        if (appointmentResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const appointment = appointmentResult.rows[0];
        if (req.user.role === 'practitioner' && appointment.practitioner_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const docsResult = await db.query(
            `SELECT id, name, document_code, file_type, category, notes, file_path, mime_type, file_size,
                    access_scope, appointment_id, appointment_access_id, created_at, updated_at
             FROM patient_documents
             WHERE patient_id = $1
               AND (
                    appointment_id = $2
                    OR appointment_access_id = $2
               )
             ORDER BY created_at DESC`,
            [appointment.patient_id, appointment.id]
        );

        res.json({
            success: true,
            data: docsResult.rows.map((doc) => ({
                ...doc,
                file_url: doc.file_path
                    ? resolveStoredUploadUrl(buildUploadUrl('patient-documents', path.basename(doc.file_path))) || null
                    : null
            }))
        });
    } catch (error) {
        console.error('Failed to fetch appointment documents:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch appointment documents' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const appointmentResult = await db.query(
            'SELECT id, practitioner_id, google_event_id FROM appointments WHERE id = $1 AND clinic_id = $2',
            [req.params.id, req.user.clinicId]
        );

        if (appointmentResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const appointment = appointmentResult.rows[0];
        if (appointment.google_event_id) {
            try {
                await cancelGoogleEvent({
                    practitionerId: appointment.practitioner_id,
                    googleEventId: appointment.google_event_id
                });
            } catch (error) {
                console.error('Failed to cancel linked Google event before deletion', {
                    appointmentId: appointment.id,
                    googleEventId: appointment.google_event_id,
                    message: error.message
                });
            }
        }

        const result = await db.query(
            'DELETE FROM appointments WHERE id = $1 AND clinic_id = $2 RETURNING id',
            [req.params.id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete appointment' });
    }
});

router.get('/teleconsultations', authMiddleware, async (req, res) => {
    try {
        const clinicId = req.user.clinicId;
        const { scope = 'upcoming' } = req.query;
        const params = [clinicId];
        let whereClauses = [
            'a.clinic_id = $1',
            "a.consultation_mode = 'online'"
        ];

        if (req.user.role === 'practitioner') {
            params.push(req.user.id);
            whereClauses.push(`a.practitioner_id = $${params.length}`);
        }

        if (scope === 'today') {
            params.push(new Date().toISOString().split('T')[0]);
            whereClauses.push(`DATE(a.start_time) = $${params.length}`);
        } else {
            params.push(new Date().toISOString());
            whereClauses.push(`a.end_time >= $${params.length}`);
        }

        const result = await db.query(
            `SELECT a.*, p.first_name, p.last_name, p.phone, p.email,
                    u.first_name AS dr_first, u.last_name AS dr_last
             FROM appointments a
             LEFT JOIN patients p ON a.patient_id = p.id
             LEFT JOIN users u ON a.practitioner_id = u.id
             WHERE ${whereClauses.join(' AND ')}
             ORDER BY a.start_time ASC`,
            params
        );

        const appointments = result.rows.map((appointment) => ({
            ...buildAppointmentResponse(appointment),
            patient: appointment.first_name ? {
                firstName: appointment.first_name,
                lastName: appointment.last_name,
                fullName: `${appointment.first_name} ${appointment.last_name}`,
                phone: appointment.phone,
                email: appointment.email
            } : null,
            practitioner: appointment.dr_first ? {
                fullName: `Dr. ${appointment.dr_first} ${appointment.dr_last}`
            } : null
        }));

        const summary = {
            total: appointments.length,
            ready: appointments.filter((appointment) => appointment.meeting.status === 'ready').length,
            upcomingToday: appointments.filter((appointment) => new Date(appointment.start).toDateString() === new Date().toDateString()).length,
            pending: appointments.filter((appointment) => ['pending', 'awaiting_approval'].includes(appointment.meeting.status)).length
        };

        res.json({ success: true, data: { appointments, summary } });
    } catch (error) {
        console.error('Failed to fetch teleconsultations', error);
        res.status(500).json({ success: false, message: 'Failed to fetch teleconsultations' });
    }
});

router.get('/summary/today', authMiddleware, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const result = await db.query(
            `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status IN ('awaiting_approval', 'scheduled')) as scheduled,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM appointments
       WHERE clinic_id = $1 AND DATE(start_time) = $2`,
            [req.user.clinicId, today]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch summary' });
    }
});

module.exports = router;
