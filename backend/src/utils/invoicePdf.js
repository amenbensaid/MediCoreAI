const stripPdfText = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapePdfText = (value) => stripPdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EUR`;

const toDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const formatDate = (value) => {
    const date = toDate(value);
    if (!date) return 'Non renseigne';
    return date.toLocaleDateString('fr-FR');
};

const formatDateTime = (value) => {
    const date = toDate(value);
    if (!date) return 'Non renseigne';
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getField = (source, ...keys) => {
    for (const key of keys) {
        if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') {
            return source[key];
        }
    }
    return null;
};

const getDurationMinutes = (invoice) => {
    const explicit = Number(getField(invoice, 'duration_minutes', 'durationMinutes'));
    if (explicit > 0) return explicit;

    const start = toDate(getField(invoice, 'start_time', 'appointmentStart'));
    const end = toDate(getField(invoice, 'end_time', 'appointmentEnd'));
    if (!start || !end) return null;

    const diff = Math.round((end.getTime() - start.getTime()) / 60000);
    return diff > 0 ? diff : null;
};

const formatMode = (value) => {
    const mode = String(value || '').toLowerCase();
    if (mode === 'online') return 'En ligne';
    if (mode === 'in-person' || mode === 'onsite' || mode === 'presentiel') return 'Presentiel';
    return value || 'Non renseigne';
};

const formatStatus = (value) => {
    const status = String(value || '').toLowerCase();
    const map = {
        draft: 'Brouillon',
        sent: 'Envoyee',
        paid: 'Payee',
        partial: 'Partielle',
        overdue: 'En retard',
        cancelled: 'Annulee'
    };
    return map[status] || value || '-';
};

const addText = (commands, text, x, y, size = 11, font = 'F1') => {
    commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
};

const addRightText = (commands, text, rightX, y, size = 11, font = 'F1') => {
    const clean = stripPdfText(text);
    const estimatedWidth = clean.length * size * 0.52;
    addText(commands, clean, Math.max(40, rightX - estimatedWidth), y, size, font);
};

const addRect = (commands, x, y, width, height, color) => {
    commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
};

const addStrokeRect = (commands, x, y, width, height, color = '0.85 0.89 0.94', lineWidth = 1) => {
    commands.push(`${color} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S`);
};

const addDivider = (commands, y, x = 55, width = 485) => {
    addRect(commands, x, y, width, 0.8, '0.88 0.91 0.95');
    commands.push('0 0 0 rg');
};

const addWrappedText = (commands, text, x, y, maxChars, size = 10, lineHeight = 14, font = 'F1') => {
    const words = stripPdfText(text).split(' ').filter(Boolean);
    const lines = [];
    let current = '';

    words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxChars && current) {
            lines.push(current);
            current = word;
        } else {
            current = next;
        }
    });
    if (current) lines.push(current);
    if (lines.length === 0) lines.push('-');

    lines.slice(0, 3).forEach((line, index) => {
        addText(commands, line, x, y - index * lineHeight, size, font);
    });
};

const buildPdf = (commands) => {
    const stream = commands.join('\n');
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
        `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
};

const buildInvoicePdf = ({ invoice, items = [], payments = [] }) => {
    const invoiceNumber = getField(invoice, 'invoice_number', 'invoiceNumber') || 'Non renseigne';
    const patientName = getField(invoice, 'patient_name', 'patientName') || 'Non renseigne';
    const patientEmail = getField(invoice, 'patient_email', 'patientEmail') || 'Non renseigne';
    const patientPhone = getField(invoice, 'patient_phone', 'patientPhone') || '';
    const practitionerName = [getField(invoice, 'dr_first'), getField(invoice, 'dr_last')].filter(Boolean).join(' ') ||
        getField(invoice, 'practitionerName') || 'Non renseigne';
    const clinicName = getField(invoice, 'clinic_name', 'clinicName') || 'MediCore AI';
    const appointmentType = getField(invoice, 'appointment_type', 'appointmentType') || 'Seance medicale';
    const startTime = getField(invoice, 'start_time', 'appointmentStart');
    const endTime = getField(invoice, 'end_time', 'appointmentEnd');
    const duration = getDurationMinutes(invoice);
    const consultationMode = formatMode(getField(invoice, 'consultation_mode', 'consultationMode'));
    const subtotal = Number(getField(invoice, 'subtotal') || 0);
    const taxAmount = Number(getField(invoice, 'tax_amount', 'taxAmount') || 0);
    const totalAmount = Number(getField(invoice, 'total_amount', 'totalAmount') || 0);
    const paidAmount = Number(getField(invoice, 'paid_amount', 'paidAmount') || 0);
    const balance = totalAmount - paidAmount;
    const normalizedItems = items.length ? items : [{
        description: `${appointmentType}${startTime ? ` - ${formatDateTime(startTime)}` : ''}`,
        quantity: 1,
        unit_price: totalAmount,
        total: totalAmount
    }];

    const commands = [
        '0.97 0.98 0.99 rg 0 0 595 842 re f',
        '1 1 1 rg 38 52 519 738 re f',
        '0.82 0.85 0.89 RG 1 w 38 52 519 738 re S',
        '0.06 0.08 0.12 rg 38 730 519 60 re f',
        '0.93 0.95 0.97 rg 38 690 519 40 re f',
        '0 0 0 rg'
    ];

    commands.push('1 1 1 rg');
    addText(commands, clinicName, 60, 765, 21, 'F2');
    addText(commands, 'Facture medicale', 395, 766, 17, 'F2');
    addText(commands, invoiceNumber, 395, 745, 11, 'F2');
    commands.push('0 0 0 rg');
    addText(commands, `Date facture: ${formatDate(getField(invoice, 'created_at', 'createdAt'))}`, 60, 707, 10, 'F2');
    addText(commands, `Echeance: ${formatDate(getField(invoice, 'due_date', 'dueDate'))}`, 220, 707, 10, 'F2');
    addText(commands, `Statut: ${formatStatus(getField(invoice, 'status'))}`, 390, 707, 10, 'F2');

    commands.push('0 0 0 rg');
    addText(commands, 'Patient', 60, 662, 12, 'F2');
    addDivider(commands, 652, 60, 205);
    commands.push('0 0 0 rg');
    addText(commands, patientName, 60, 633, 12, 'F2');
    addText(commands, patientEmail, 60, 617, 10);
    if (patientPhone) addText(commands, patientPhone, 60, 602, 10);

    addText(commands, 'Praticien / cabinet', 330, 662, 12, 'F2');
    addDivider(commands, 652, 330, 205);
    commands.push('0 0 0 rg');
    addText(commands, practitionerName, 330, 633, 12, 'F2');
    addText(commands, clinicName, 330, 617, 10);
    addText(commands, consultationMode, 330, 602, 10);

    addRect(commands, 60, 535, 475, 48, '0.97 0.98 0.99');
    addStrokeRect(commands, 60, 535, 475, 48, '0.82 0.85 0.89');
    commands.push('0 0 0 rg');
    addText(commands, 'Detail de la seance', 78, 562, 12, 'F2');
    addText(commands, appointmentType, 78, 545, 10);
    addText(commands, `Date: ${formatDateTime(startTime)}`, 245, 562, 10, 'F2');
    addText(commands, `Duree: ${duration ? `${duration} min` : 'Non renseignee'}`, 245, 545, 10);
    addText(commands, `Fin: ${formatDateTime(endTime)}`, 385, 562, 10);
    addText(commands, `Mode: ${consultationMode}`, 385, 545, 10);

    addText(commands, 'Seance / articles', 60, 505, 13, 'F2');
    addRect(commands, 60, 475, 475, 26, '0.10 0.12 0.16');
    commands.push('1 1 1 rg');
    addText(commands, 'Description', 72, 484, 9, 'F2');
    addText(commands, 'Qte', 320, 484, 9, 'F2');
    addText(commands, 'Prix unitaire', 365, 484, 9, 'F2');
    addText(commands, 'Total', 486, 484, 9, 'F2');

    let y = 449;
    commands.push('0 0 0 rg');
    normalizedItems.slice(0, 8).forEach((item, index) => {
        if (index % 2 === 0) addRect(commands, 60, y - 9, 475, 31, '0.98 0.98 0.98');
        commands.push('0 0 0 rg');
        addWrappedText(commands, item.description || 'Seance medicale', 72, y + 3, 38, 9, 11);
        addText(commands, item.quantity || 1, 323, y, 9);
        addRightText(commands, formatMoney(getField(item, 'unit_price', 'unitPrice')), 446, y, 9);
        addRightText(commands, formatMoney(getField(item, 'total') || (Number(item.quantity || 1) * Number(getField(item, 'unit_price', 'unitPrice') || 0))), 520, y, 9, 'F2');
        addDivider(commands, y - 16, 60, 475);
        y -= 35;
    });

    const totalsY = Math.min(y - 8, 278);
    addRect(commands, 330, totalsY, 205, 120, '0.98 0.98 0.98');
    addStrokeRect(commands, 330, totalsY, 205, 120, '0.70 0.73 0.78');
    commands.push('0 0 0 rg');
    addText(commands, 'Resume paiement', 350, totalsY + 96, 12, 'F2');
    addText(commands, 'Sous-total', 350, totalsY + 73, 10);
    addRightText(commands, formatMoney(subtotal), 515, totalsY + 73, 10);
    addText(commands, 'Taxe', 350, totalsY + 55, 10);
    addRightText(commands, formatMoney(taxAmount), 515, totalsY + 55, 10);
    addDivider(commands, totalsY + 43, 350, 165);
    commands.push('0 0 0 rg');
    addText(commands, 'Total', 350, totalsY + 27, 13, 'F2');
    addRightText(commands, formatMoney(totalAmount), 515, totalsY + 27, 13, 'F2');
    addText(commands, 'Paye', 350, totalsY + 9, 10);
    addRightText(commands, formatMoney(paidAmount), 515, totalsY + 9, 10);
    addText(commands, 'Reste', 350, totalsY - 10, 12, 'F2');
    addRightText(commands, formatMoney(balance), 515, totalsY - 10, 12, 'F2');

    if (payments.length > 0) {
        commands.push('0 0 0 rg');
        addText(commands, 'Paiements recus', 60, totalsY + 96, 12, 'F2');
        let paymentY = totalsY + 74;
        payments.slice(0, 5).forEach((payment) => {
            commands.push('0 0 0 rg');
            addText(commands, `${formatDate(payment.payment_date)} - ${payment.payment_method || 'Paiement'}`, 60, paymentY, 10, 'F2');
            addText(commands, formatMoney(payment.amount), 60, paymentY - 14, 10);
            paymentY -= 18;
        });
    } else {
        commands.push('0 0 0 rg');
        addText(commands, 'Paiements recus', 60, totalsY + 96, 12, 'F2');
        addText(commands, 'Aucun paiement enregistre pour cette facture.', 60, totalsY + 74, 10);
    }

    addDivider(commands, 118, 60, 475);
    commands.push('0 0 0 rg');
    addText(commands, 'Document genere automatiquement par MediCore AI.', 60, 96, 9);
    addText(commands, 'Merci de conserver cette facture pour votre dossier medical.', 60, 82, 9);
    addRightText(commands, `Facture ${invoiceNumber}`, 535, 82, 9, 'F2');

    return buildPdf(commands);
};

module.exports = {
    buildInvoicePdf
};
