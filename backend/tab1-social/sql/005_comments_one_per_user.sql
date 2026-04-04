BEGIN;

WITH ranked_comments AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY post_id, user_id
      ORDER BY created_at DESC, id DESC
    ) AS row_number
  FROM social.comments
)
DELETE FROM social.comments c
USING ranked_comments r
WHERE c.id = r.id
  AND r.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_comments_post_user_unique
ON social.comments (post_id, user_id);

COMMIT;
