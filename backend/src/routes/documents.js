const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { ensureUploadDir } = require('../utils/uploads');

const router = express.Router();

const documentsDir = ensureUploadDir('documents');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/dicom'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

router.get('/patient/:patientId', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM documents WHERE patient_id = $1 AND clinic_id = $2 ORDER BY created_at DESC`,
            [req.params.patientId, req.user.clinicId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
});

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { patientId, documentType, description } = req.body;

        const result = await db.query(
            `INSERT INTO documents (patient_id, clinic_id, uploaded_by, document_type, file_name, file_path, file_size, mime_type, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [patientId, req.user.clinicId, req.user.id, documentType, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, description]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM documents WHERE id = $1 AND clinic_id = $2 RETURNING id, file_path',
            [req.params.id, req.user.clinicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const filePath = result.rows[0].file_path;
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
});

module.exports = router;
