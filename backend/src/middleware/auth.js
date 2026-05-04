const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const result = await db.query(
                `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.specialty, u.is_active,
                u.access_permissions, u.assigned_practitioner_id,
                uc.clinic_id, uc.role as clinic_role, c.name as clinic_name, c.type as clinic_type
         FROM users u
         LEFT JOIN user_clinics uc ON u.id = uc.user_id
         LEFT JOIN clinics c ON uc.clinic_id = c.id
         WHERE u.id = $1 AND u.is_active = true`,
                [decoded.userId]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found or inactive.'
                });
            }

            req.user = {
                id: result.rows[0].id,
                email: result.rows[0].email,
                firstName: result.rows[0].first_name,
                lastName: result.rows[0].last_name,
                role: result.rows[0].role,
                specialty: result.rows[0].specialty,
                clinicId: result.rows[0].clinic_id,
                clinicRole: result.rows[0].clinic_role,
                clinicName: result.rows[0].clinic_name,
                clinicType: result.rows[0].clinic_type,
                assignedPractitionerId: result.rows[0].assigned_practitioner_id,
                accessPermissions: result.rows[0].access_permissions || {}
            };

            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired. Please login again.'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication.'
        });
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role) && !roles.includes(req.user.clinicRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const result = await db.query(
                'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );

            if (result.rows.length > 0) {
                req.user = {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    firstName: result.rows[0].first_name,
                    lastName: result.rows[0].last_name,
                    role: result.rows[0].role
                };
            }
        } catch (jwtError) {
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authMiddleware,
    requireRole,
    optionalAuth
};
