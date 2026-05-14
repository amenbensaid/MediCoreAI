ALTER TABLE invoices ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_appointment_id
    ON invoices(appointment_id)
    WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_clinic_date
    ON payments(clinic_id, payment_date DESC);
