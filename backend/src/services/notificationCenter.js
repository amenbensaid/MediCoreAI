const db = require('../config/database');
const { sendWebPushToPatient, sendWebPushToUser } = require('./webPushNotifications');

const createNotification = async ({
    clinicId = null,
    userId = null,
    patientId = null,
    targetRole = null,
    type = 'info',
    title,
    message,
    url = null,
    metadata = {}
}) => {
    if (!title || !message) {
        return null;
    }

    const result = await db.query(
        `INSERT INTO notifications (
            clinic_id, user_id, patient_id, target_role, type, title, message, url, metadata
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
            clinicId,
            userId,
            patientId,
            targetRole,
            type,
            title,
            message,
            url,
            JSON.stringify(metadata || {})
        ]
    );

    const payload = { title, body: message, url: url || '/' };
    if (userId) {
        sendWebPushToUser({ userId, payload }).catch(() => {});
    }
    if (patientId) {
        sendWebPushToPatient({ patientId, payload }).catch(() => {});
    }

    return result.rows[0];
};

const createClinicRoleNotification = async ({
    clinicId,
    targetRole,
    type = 'info',
    title,
    message,
    url,
    metadata
}) => {
    if (!clinicId || !targetRole) return [];
    const users = await db.query(
        `SELECT u.id
         FROM users u
         JOIN user_clinics uc ON uc.user_id = u.id
         WHERE uc.clinic_id = $1 AND u.role = $2 AND u.is_active = true`,
        [clinicId, targetRole]
    );

    return Promise.all(users.rows.map((row) => createNotification({
        clinicId,
        userId: row.id,
        targetRole,
        type,
        title,
        message,
        url,
        metadata
    })));
};

const createPlatformAdminNotification = async ({
    type = 'info',
    title,
    message,
    url,
    metadata
}) => {
    const admins = await db.query(
        `SELECT id
         FROM users
         WHERE role = 'admin' AND is_active = true`
    );

    return Promise.all(admins.rows.map((row) => createNotification({
        userId: row.id,
        targetRole: 'admin',
        type,
        title,
        message,
        url,
        metadata
    })));
};

const createClinicAdminNotification = async ({
    clinicId,
    type = 'info',
    title,
    message,
    url,
    metadata,
    excludeUserId = null
}) => {
    if (!clinicId) return [];
    const params = [clinicId];
    let excludeClause = '';
    if (excludeUserId) {
        params.push(excludeUserId);
        excludeClause = `AND u.id <> $${params.length}`;
    }

    const admins = await db.query(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN user_clinics uc ON uc.user_id = u.id
         WHERE uc.clinic_id = $1
           AND uc.role = 'admin'
           AND u.is_active = true
           ${excludeClause}`,
        params
    );

    return Promise.all(admins.rows.map((row) => createNotification({
        clinicId,
        userId: row.id,
        targetRole: 'clinic_admin',
        type,
        title,
        message,
        url,
        metadata
    })));
};

module.exports = {
    createNotification,
    createClinicRoleNotification,
    createPlatformAdminNotification,
    createClinicAdminNotification
};
