const db = require('../config/database');

let webpush = null;
try {
    webpush = require('web-push');
} catch (error) {
    webpush = null;
}

const hasPushConfig = () => (
    webpush &&
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
);

if (hasPushConfig()) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

const saveSubscription = async ({ userId = null, patientId = null, role, subscription }) => {
    if (!subscription?.endpoint) {
        const error = new Error('Invalid web push subscription');
        error.statusCode = 400;
        throw error;
    }

    const result = await db.query(
        `INSERT INTO web_push_subscriptions (user_id, patient_id, role, endpoint, subscription)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (endpoint)
         DO UPDATE SET
            user_id = EXCLUDED.user_id,
            patient_id = EXCLUDED.patient_id,
            role = EXCLUDED.role,
            subscription = EXCLUDED.subscription,
            updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [userId, patientId, role, subscription.endpoint, JSON.stringify(subscription)]
    );

    return result.rows[0];
};

const sendRows = async ({ rows, payload }) => {
    if (!hasPushConfig() || rows.length === 0) {
        return { sent: 0, skipped: rows.length };
    }

    let sent = 0;
    await Promise.all(rows.map(async (row) => {
        try {
            await webpush.sendNotification(row.subscription, JSON.stringify(payload));
            sent += 1;
        } catch (error) {
            if ([404, 410].includes(error.statusCode)) {
                await db.query('DELETE FROM web_push_subscriptions WHERE id = $1', [row.id]);
            }
        }
    }));

    return { sent, skipped: rows.length - sent };
};

const sendWebPushToUser = async ({ userId, payload }) => {
    if (!userId) return { sent: 0, skipped: 0 };
    const result = await db.query(
        'SELECT id, subscription FROM web_push_subscriptions WHERE user_id = $1',
        [userId]
    );
    return sendRows({ rows: result.rows, payload });
};

const sendWebPushToPatient = async ({ patientId, payload }) => {
    if (!patientId) return { sent: 0, skipped: 0 };
    const result = await db.query(
        'SELECT id, subscription FROM web_push_subscriptions WHERE patient_id = $1',
        [patientId]
    );
    return sendRows({ rows: result.rows, payload });
};

module.exports = {
    saveSubscription,
    sendWebPushToUser,
    sendWebPushToPatient
};
