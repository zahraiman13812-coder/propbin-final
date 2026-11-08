-- Run once in Neon SQL Editor. Existing users and polls remain intact.
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS recovery_hash text;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS site_users_phone_unique ON site_users(phone) WHERE phone IS NOT NULL;
CREATE TABLE IF NOT EXISTS user_auth_attempts (
  identifier text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  first_attempt timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz
);
-- Accounts created with email OTP remain, but must set a password via a verified recovery process.
