ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS requested_documents JSONB DEFAULT '[]'::jsonb;

UPDATE appointments
SET requested_documents = '[]'::jsonb
WHERE requested_documents IS NULL;
