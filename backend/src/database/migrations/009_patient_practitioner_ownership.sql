ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS primary_practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patients_primary_practitioner
  ON patients(primary_practitioner_id)
  WHERE primary_practitioner_id IS NOT NULL;

UPDATE patients p
SET primary_practitioner_id = source.practitioner_id
FROM (
  SELECT DISTINCT ON (patient_id)
    patient_id,
    practitioner_id
  FROM appointments
  WHERE practitioner_id IS NOT NULL
  ORDER BY patient_id, start_time DESC
) source
WHERE p.id = source.patient_id
  AND p.primary_practitioner_id IS NULL;
