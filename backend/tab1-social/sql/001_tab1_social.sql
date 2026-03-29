BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS social;

CREATE TABLE IF NOT EXISTS social.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id text NOT NULL,
  author_name text NOT NULL,
  author_branch text NOT NULL DEFAULT 'NITR',
  caption text NOT NULL CHECK (char_length(caption) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS social.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  uri text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social.post_hypes (
  post_id uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS social.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  display_name text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social.posts (created_at DESC, id DESC)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_post_media_post_id ON social.post_media (post_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_social_post_hypes_user_id ON social.post_hypes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_comments_post_id ON social.comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_social_post_hashtags_hashtag_id ON social.post_hashtags (hashtag_id, post_id);

CREATE OR REPLACE FUNCTION social.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_posts_touch_updated_at ON social.posts;
CREATE TRIGGER trg_social_posts_touch_updated_at
BEFORE UPDATE ON social.posts
FOR EACH ROW
EXECUTE FUNCTION social.touch_updated_at();

DROP TRIGGER IF EXISTS trg_social_comments_touch_updated_at ON social.comments;
CREATE TRIGGER trg_social_comments_touch_updated_at
BEFORE UPDATE ON social.comments
FOR EACH ROW
EXECUTE FUNCTION social.touch_updated_at();

COMMIT;
