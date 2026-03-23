require("dotenv").config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');

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
const communicationRoutes = require('./routes/communications');

const app = express();
const PORT = process.env.PORT || 5000;

// app.use(helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" },
//     referrerPolicy: { policy: "no-referrer-when-downgrade" }
// }));

app.use(cors({
    origin: "*",
 
}));

// Add custom headers for referrer policy


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
    console.log('request received')
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
app.use('/api/communications', communicationRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`
    });
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    Server running on port ${PORT} 
    Environment: ${process.env.NODE_ENV || 'development'}
  `);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
