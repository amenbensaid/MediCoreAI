const fs = require('fs');
const path = require('path');

const uploadsRoot = path.join(process.cwd(), 'uploads');

const ensureUploadDir = (...segments) => {
    const dir = path.join(uploadsRoot, ...segments);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

const buildUploadUrl = (...segments) => `/uploads/${segments.map((segment) => path.basename(segment)).join('/')}`;

const detectDocumentType = ({ mimeType, filename } = {}) => {
    const normalizedMime = String(mimeType || '').toLowerCase();
    const extension = path.extname(String(filename || '')).toLowerCase();

    if (normalizedMime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
        return 'image';
    }

    if (normalizedMime === 'application/pdf' || extension === '.pdf') {
        return 'pdf';
    }

    return 'document';
};

const resolveStoredUploadUrl = (value) => {
    const nextValue = String(value || '').trim();
    if (!nextValue) {
        return '';
    }

    if (!nextValue.startsWith('/uploads/')) {
        return nextValue;
    }

    const relativePath = nextValue.replace(/^\/uploads\//, '');
    const absolutePath = path.join(uploadsRoot, relativePath);

    return fs.existsSync(absolutePath) ? nextValue : '';
};

module.exports = {
    uploadsRoot,
    ensureUploadDir,
    buildUploadUrl,
    detectDocumentType,
    resolveStoredUploadUrl
};
