BEGIN;

ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE auth.users
SET full_name = COALESCE(NULLIF(btrim(full_name), ''), display_name)
WHERE full_name IS NULL OR btrim(full_name) = '';

UPDATE auth.users
SET nickname = COALESCE(NULLIF(btrim(nickname), ''), 'user_' || substr(replace(id::text, '-', ''), 1, 12))
WHERE nickname IS NULL OR btrim(nickname) = '';

UPDATE auth.users
SET birth_date = COALESCE(birth_date, DATE '2000-01-01')
WHERE birth_date IS NULL;

UPDATE auth.users
SET gender = COALESCE(NULLIF(lower(btrim(gender)), ''), 'other')
WHERE gender IS NULL OR btrim(gender) = '';

ALTER TABLE auth.users
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN nickname SET NOT NULL,
  ALTER COLUMN birth_date SET NOT NULL,
  ALTER COLUMN gender SET NOT NULL,
  ALTER COLUMN interests SET DEFAULT ARRAY[]::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_auth_users_gender'
      AND conrelid = 'auth.users'::regclass
  ) THEN
    ALTER TABLE auth.users
      ADD CONSTRAINT chk_auth_users_gender
      CHECK (gender IN ('male', 'female', 'other'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_nickname_unique
  ON auth.users (nickname);

CREATE INDEX IF NOT EXISTS idx_auth_users_gender
  ON auth.users (gender);

COMMIT;
