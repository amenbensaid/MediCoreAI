CREATE TABLE IF NOT EXISTS appointment_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    desired_start_time TIMESTAMP NOT NULL,
    desired_end_time TIMESTAMP NOT NULL,
    appointment_type VARCHAR(100) DEFAULT 'Consultation',
    consultation_mode VARCHAR(20) DEFAULT 'in-person',
    reason_category VARCHAR(100),
    reason_detail TEXT,
    notes TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    offer_expires_at TIMESTAMP,
    source_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    accepted_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_slot
    ON appointment_waitlist(practitioner_id, desired_start_time, status, created_at);

CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_patient
    ON appointment_waitlist(patient_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_waitlist_unique_active
    ON appointment_waitlist(patient_id, practitioner_id, desired_start_time)
    WHERE status IN ('pending', 'offered');
