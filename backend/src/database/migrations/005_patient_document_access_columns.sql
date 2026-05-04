ALTER TABLE patient_documents
  ADD COLUMN IF NOT EXISTS document_code VARCHAR(120),
  ADD COLUMN IF NOT EXISTS access_scope VARCHAR(30) DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS appointment_access_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

UPDATE patient_documents
SET
  access_scope = CASE
    WHEN appointment_id IS NOT NULL THEN 'appointment'
    ELSE COALESCE(access_scope, 'private')
  END,
  appointment_access_id = COALESCE(appointment_access_id, appointment_id)
WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_documents_appointment_access
  ON patient_documents(appointment_access_id);
