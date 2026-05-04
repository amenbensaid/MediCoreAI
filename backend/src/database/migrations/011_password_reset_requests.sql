CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    temporary_password_set BOOLEAN DEFAULT false,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status_requested
    ON password_reset_requests(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_status
    ON password_reset_requests(user_id, status);
