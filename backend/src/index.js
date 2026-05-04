const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const helmet = require('helmet');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const db = require('./config/database');
const { ensureUploadDir, uploadsRoot } = require('./utils/uploads');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const invoiceRoutes = require('./routes/invoices');
const serviceRoutes = require('./routes/services');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');
const clinicRoutes = require('./routes/clinics');
const userRoutes = require('./routes/users');
const documentRoutes = require('./routes/documents');
const reviewRoutes = require('./routes/reviews');
const communicationRoutes = require('./routes/communications');
const publicRoutes = require('./routes/public');
const animalRoutes = require('./routes/animals');
const aestheticRoutes = require('./routes/aesthetic');
const demoRequestRoutes = require('./routes/demoRequests');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

const parseOrigins = (value) => String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS || process.env.FRONTEND_URL);
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' }
}));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || (!isProduction && allowedOrigins.length === 0)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use((req, res, next) => {
    const requestId = req.headers['x-client-request-id'] || crypto.randomUUID();
    const start = Date.now();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[HTTP][${requestId}] ${req.method} ${req.originalUrl} status=${res.statusCode} durationMs=${Date.now() - start}`);
        }
    });

    next();
});

// Add custom headers for referrer policy


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
ensureUploadDir();
ensureUploadDir('profile-images');
ensureUploadDir('patient-documents');
ensureUploadDir('documents');
app.use('/uploads', express.static(uploadsRoot));

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'MediCore API',
        version: '1.0.0'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/aesthetic', aestheticRoutes);
app.use('/api/demo-requests', demoRequestRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`
    });
});

app.use(errorHandler);

const startServer = async () => {
    try {
        await db.ensureCompatibilitySchema();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`
    Server running on port ${PORT} 
    Environment: ${process.env.NODE_ENV || 'development'}
  `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
