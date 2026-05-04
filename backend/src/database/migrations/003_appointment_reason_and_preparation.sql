ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reason_category VARCHAR(120),
  ADD COLUMN IF NOT EXISTS reason_detail TEXT,
  ADD COLUMN IF NOT EXISTS preparation_notes TEXT,
  ADD COLUMN IF NOT EXISTS medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_documents JSONB DEFAULT '[]'::jsonb;

ALTER TABLE patient_documents
  ADD COLUMN IF NOT EXISTS document_code VARCHAR(120),
  ADD COLUMN IF NOT EXISTS access_scope VARCHAR(30) DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS appointment_access_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
