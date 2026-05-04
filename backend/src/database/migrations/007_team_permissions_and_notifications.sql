ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_permissions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    target_role VARCHAR(50),
    type VARCHAR(50) DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_unread ON notifications(patient_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_role ON notifications(clinic_id, target_role, created_at DESC);
