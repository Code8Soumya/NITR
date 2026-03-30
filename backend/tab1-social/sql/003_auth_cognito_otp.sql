BEGIN;

ALTER TABLE auth.users
    ADD COLUMN IF NOT EXISTS cognito_sub text,
    ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS otp_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_cognito_sub_unique
    ON auth.users (cognito_sub)
    WHERE cognito_sub IS NOT NULL;

COMMIT;