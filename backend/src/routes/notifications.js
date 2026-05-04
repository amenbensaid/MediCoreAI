const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const db = require('../config/database');
const { saveSubscription } = require('../services/webPushNotifications');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 30, 100);
        const result = await db.query(
            `SELECT id, type, title, message, url, metadata, read_at, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [req.user.id, limit]
        );

        res.json({
            success: true,
            data: result.rows.map((row) => ({
                id: row.id,
                type: row.type,
                title: row.title,
                message: row.message,
                url: row.url,
                metadata: row.metadata || {},
                readAt: row.read_at,
                createdAt: row.created_at,
                read: Boolean(row.read_at)
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE notifications
             SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
});

router.patch('/read-all', authMiddleware, async (req, res) => {
    try {
        await db.query(
            `UPDATE notifications
             SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
             WHERE user_id = $1 AND read_at IS NULL`,
            [req.user.id]
        );

        res.json({ success: true, message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
    }
});

router.post('/web-push/subscribe', authMiddleware, async (req, res) => {
    try {
        await saveSubscription({
            userId: req.user.id,
            role: req.user.role || 'staff',
            subscription: req.body.subscription
        });

        res.json({ success: true, message: 'Web push subscription saved' });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to save web push subscription'
        });
    }
});

module.exports = router;
