BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  branch text NOT NULL DEFAULT 'NITR',
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  is_admin boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email = lower(email)),
  CHECK (email ~ '^[^@[:space:]]+@nitrkl\.ac\.in$')
);

CREATE TABLE IF NOT EXISTS auth.refresh_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_approval_status
  ON auth.users (approval_status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_sessions_user_id
  ON auth.refresh_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_sessions_expires
  ON auth.refresh_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION auth.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_touch_updated_at ON auth.users;
CREATE TRIGGER trg_auth_users_touch_updated_at
BEFORE UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.touch_updated_at();

COMMIT;
