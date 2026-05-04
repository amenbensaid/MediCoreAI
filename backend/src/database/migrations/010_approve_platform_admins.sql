UPDATE users
SET is_verified = true,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE role = 'admin';
