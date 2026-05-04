ALTER TABLE users
  ADD COLUMN IF NOT EXISTS assigned_practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_practitioner
  ON users(assigned_practitioner_id)
  WHERE assigned_practitioner_id IS NOT NULL;
