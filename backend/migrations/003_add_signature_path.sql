-- Adds the stored signature path for each user.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signature_path TEXT;

CREATE INDEX IF NOT EXISTS idx_users_signature_path ON users(signature_path);
