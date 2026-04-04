BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS social;

-- ==========================================
-- AUTH SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub text UNIQUE,

  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  
  display_name text NOT NULL,
  full_name text NOT NULL,
  nickname text NOT NULL UNIQUE,
  branch text NOT NULL DEFAULT 'NITR',
  birth_date date NOT NULL,
  gender text NOT NULL DEFAULT 'other' CHECK (gender IN ('male', 'female', 'other')),
  bio text,
  interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  
  email_verified boolean NOT NULL DEFAULT false,
  otp_verified_at timestamptz,
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

CREATE INDEX idx_auth_users_approval_status ON auth.users (approval_status, created_at ASC);
CREATE INDEX idx_auth_users_gender ON auth.users (gender);

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

CREATE INDEX idx_auth_refresh_sessions_user_id ON auth.refresh_sessions (user_id, created_at DESC);
CREATE INDEX idx_auth_refresh_sessions_expires ON auth.refresh_sessions (expires_at) WHERE revoked_at IS NULL;

-- Automatically update `updated_at` trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auth_users_updated_at 
BEFORE UPDATE ON auth.users 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- SOCIAL SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS social.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text NOT NULL CHECK (char_length(caption) BETWEEN 1 AND 2000),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'connections')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_social_posts_author ON social.posts (author_id);
CREATE INDEX idx_social_posts_created_at ON social.posts (created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_social_posts_updated_at BEFORE UPDATE ON social.posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS social.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  uri text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_post_media_post_id ON social.post_media (post_id, sort_order);

CREATE TABLE IF NOT EXISTS social.post_hypes (
  post_id uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_social_post_hypes_user_id ON social.post_hypes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS social.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX idx_social_comments_post_id ON social.comments (post_id, created_at ASC);
CREATE TRIGGER trg_social_comments_updated_at BEFORE UPDATE ON social.comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS social.hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL UNIQUE CHECK (tag ~ '^#[A-Za-z0-9_]+$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social.post_hashtags (
  post_id uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES social.hashtags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, hashtag_id)
);
CREATE INDEX idx_social_post_hashtags_hashtag_id ON social.post_hashtags (hashtag_id, post_id);

-- Tracking followers and following
CREATE TABLE IF NOT EXISTS social.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX idx_social_follows_following ON social.follows(following_id);

COMMIT;
