const db = require('../config/database');
const { createNotification } = require('./notificationCenter');
const { formatLocalDateTime } = require('../utils/dateTime');

const activeStatuses = ['pending', 'offered'];

const getWaitlistPosition = async (client, entry) => {
    const result = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM appointment_waitlist
         WHERE practitioner_id = $1
           AND desired_start_time = $2
           AND status = ANY($3)
           AND created_at < $4`,
        [entry.practitioner_id, entry.desired_start_time, activeStatuses, entry.created_at]
    );
    return Number(result.rows[0]?.count || 0) + 1;
};

const mapWaitlistEntry = async (client, row) => ({
    id: row.id,
    practitionerId: row.practitioner_id,
    practitioner: row.dr_first ? `Dr. ${row.dr_first} ${row.dr_last}` : null,
    specialty: row.specialty || null,
    startTime: formatLocalDateTime(row.desired_start_time),
    endTime: formatLocalDateTime(row.desired_end_time),
    appointmentType: row.appointment_type,
    consultationMode: row.consultation_mode,
    reasonCategory: row.reason_category,
    reasonDetail: row.reason_detail,
    notes: row.notes,
    status: row.status,
    offerExpiresAt: row.offer_expires_at ? formatLocalDateTime(row.offer_expires_at) : null,
    createdAt: row.created_at,
    position: ['pending', 'offered'].includes(row.status) ? await getWaitlistPosition(client, row) : null
});

const offerNextWaitlistForSlot = async ({
    practitionerId,
    startTime,
    endTime,
    sourceAppointmentId = null
}) => {
    const result = await db.query(
        `SELECT aw.*, p.first_name, p.last_name
         FROM appointment_waitlist aw
         JOIN patients p ON p.id = aw.patient_id
         WHERE aw.practitioner_id = $1
           AND aw.desired_start_time = $2
           AND aw.status = 'pending'
         ORDER BY aw.created_at ASC
         LIMIT 1`,
        [practitionerId, startTime]
    );

    if (result.rows.length === 0) return null;

    const entry = result.rows[0];
    const offerExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const update = await db.query(
        `UPDATE appointment_waitlist
         SET status = 'offered',
             offer_expires_at = $1,
             source_appointment_id = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [offerExpiresAt, sourceAppointmentId, entry.id]
    );

    const offered = update.rows[0];
    await createNotification({
        clinicId: offered.clinic_id,
        patientId: offered.patient_id,
        type: 'appointment',
        title: 'Place disponible',
        message: 'Un créneau vient de se libérer. Vous pouvez prendre cette place ou la laisser au patient suivant.',
        url: '/patient/portal',
        metadata: { waitlistId: offered.id, event: 'waitlist_offer' }
    });

    return { ...offered, desired_end_time: endTime || offered.desired_end_time };
};

const offerNextWaitlistForAppointment = async (appointment) => {
    if (!appointment?.practitioner_id || !appointment?.start_time) return null;
    return offerNextWaitlistForSlot({
        practitionerId: appointment.practitioner_id,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        sourceAppointmentId: appointment.id
    });
};

module.exports = {
    getWaitlistPosition,
    mapWaitlistEntry,
    offerNextWaitlistForSlot,
    offerNextWaitlistForAppointment
};
