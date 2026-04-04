import { Buffer } from "node:buffer";

import { withTransaction } from "./db.js";
import { HttpError } from "./errors.js";
import { extractHashtags, normalizeHashtag, validateHashtagCount } from "./hashtags.js";
import { logWarn } from "./logger.js";
import { resolveMediaReadUrl } from "./media.js";

const maxCaptionLength = 2000;
const maxCommentLength = 1000;

const mapComment = (row) => ({
  id: row.id,
  postId: row.post_id,
  userId: row.user_id,
  displayName: row.display_name,
  body: row.body,
  createdAt: new Date(row.created_at).toISOString()
});

const encodeCursor = ({ createdAt, id }) =>
  Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString("base64url");

const decodeCursor = (cursor) => {
  if (!cursor) {
    return { createdAt: null, id: null };
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

    if (!decoded.createdAt || !decoded.id) {
      throw new Error("Malformed cursor");
    }

    return {
      createdAt: decoded.createdAt,
      id: decoded.id
    };
  } catch (error) {
    logWarn(
      "Feed cursor decode failed",
      {
        file: "backend/tab1-social/src/lib/socialRepository.js",
        location: "decodeCursor",
        action: "decode feed pagination cursor",
        cursor
      },
      error
    );

    throw new HttpError(400, "cursor is invalid", "INVALID_CURSOR");
  }
};

const ensurePostExists = async (client, postId) => {
  const result = await client.query(
    `SELECT id FROM social.posts WHERE id = $1 AND deleted_at IS NULL`,
    [postId]
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Post not found", "POST_NOT_FOUND");
  }
};

const hydratePosts = async (client, baseRows) => {
  if (!baseRows.length) {
    return [];
  }

  const postIds = baseRows.map((row) => row.id);

  const [mediaResult, hashtagResult, commentResult] = await Promise.all([
    client.query(
      `
      SELECT id, post_id, uri, media_type
      FROM social.post_media
      WHERE post_id = ANY($1::uuid[])
      ORDER BY sort_order ASC, created_at ASC
      `,
      [postIds]
    ),
    client.query(
      `
      SELECT pht.post_id, h.tag
      FROM social.post_hashtags pht
      JOIN social.hashtags h ON h.id = pht.hashtag_id
      WHERE pht.post_id = ANY($1::uuid[])
      ORDER BY h.tag ASC
      `,
      [postIds]
    ),
    client.query(
      `
      SELECT c.id, c.post_id, c.user_id, au.display_name, c.body, c.created_at
      FROM social.comments c
      JOIN auth.users au ON au.id = c.user_id
      WHERE c.post_id = ANY($1::uuid[])
      ORDER BY c.created_at ASC
      `,
      [postIds]
    )
  ]);

  const hydratedMediaRows = await Promise.all(
    mediaResult.rows.map(async (row) => ({
      ...row,
      resolved_uri: await resolveMediaReadUrl({ uri: row.uri })
    }))
  );

  const mediaByPostId = new Map();
  for (const row of hydratedMediaRows) {
    const existing = mediaByPostId.get(row.post_id) ?? [];
    existing.push({
      id: row.id,
      uri: row.resolved_uri,
      mediaType: row.media_type
    });
    mediaByPostId.set(row.post_id, existing);
  }

  const hashtagsByPostId = new Map();
  for (const row of hashtagResult.rows) {
    const existing = hashtagsByPostId.get(row.post_id) ?? [];
    existing.push(row.tag);
    hashtagsByPostId.set(row.post_id, existing);
  }

  const commentsByPostId = new Map();
  for (const row of commentResult.rows) {
    const existing = commentsByPostId.get(row.post_id) ?? [];
    existing.push(mapComment(row));
    commentsByPostId.set(row.post_id, existing);
  }

  return baseRows.map((row) => {
    const authorBio =
      typeof row.author_bio === "string" && row.author_bio.trim().length
        ? row.author_bio.trim()
        : undefined;

    return {
      id: row.id,
      userId: row.author_user_id,
      authorName: row.author_name,
      authorBranch: row.author_branch,
      authorBio,
      caption: row.caption,
      visibility: row.visibility,
      hashtags: hashtagsByPostId.get(row.id) ?? [],
      createdAt: new Date(row.created_at).toISOString(),
      hypeCount: Number(row.hype_count ?? 0),
      isHypedByMe: Boolean(row.is_hyped_by_me),
      media: mediaByPostId.get(row.id) ?? [],
      comments: commentsByPostId.get(row.id) ?? []
    };
  });
};

const fetchPostById = async (client, postId, currentUserId) => {
  const result = await client.query(
    `
    SELECT
      p.id,
      p.author_id AS author_user_id,
      COALESCE(au.full_name, au.display_name) AS author_name,
      au.branch AS author_branch,
      NULLIF(btrim(au.bio), '') AS author_bio,
      p.caption,
      p.visibility,
      p.created_at,
      COUNT(ph.user_id)::int AS hype_count,
      COALESCE(BOOL_OR(ph.user_id = $1::uuid), false) AS is_hyped_by_me
    FROM social.posts p
    JOIN auth.users au ON au.id = p.author_id
    LEFT JOIN social.post_hypes ph ON ph.post_id = p.id
    WHERE p.id = $2::uuid
      AND p.deleted_at IS NULL
    GROUP BY p.id, au.id
    `,
    [currentUserId ?? null, postId]
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Post not found", "POST_NOT_FOUND");
  }

  const hydrated = await hydratePosts(client, result.rows);
  return hydrated[0];
};

const syncPostHashtags = async (client, postId, hashtags) => {
  if (!hashtags.length) {
    return;
  }

  for (const tag of hashtags) {
    const hashtagResult = await client.query(
      `
      INSERT INTO social.hashtags (tag)
      VALUES ($1)
      ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
      RETURNING id
      `,
      [tag]
    );

    const hashtagId = hashtagResult.rows[0]?.id;

    await client.query(
      `
      INSERT INTO social.post_hashtags (post_id, hashtag_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [postId, hashtagId]
    );
  }
};

export const listFeed = async ({
  userId,
  hashtag,
  cursor,
  limit,
  maxLimit
}) => {
  const boundedLimit = Math.min(Math.max(limit, 1), maxLimit);
  const normalizedHashtag = hashtag ? normalizeHashtag(hashtag) : null;
  const decodedCursor = decodeCursor(cursor);

  return withTransaction(async (client) => {
    const result = await client.query(
      `
      SELECT
        p.id,
        p.author_id AS author_user_id,
        COALESCE(au.full_name, au.display_name) AS author_name,
        au.branch AS author_branch,
        NULLIF(btrim(au.bio), '') AS author_bio,
        p.caption,
        p.visibility,
        p.created_at,
        COUNT(ph.user_id)::int AS hype_count,
        COALESCE(BOOL_OR(ph.user_id = $1::uuid), false) AS is_hyped_by_me
      FROM social.posts p
      JOIN auth.users au ON au.id = p.author_id
      LEFT JOIN social.post_hypes ph ON ph.post_id = p.id
      WHERE p.deleted_at IS NULL
        AND (
          p.visibility = 'public'
          OR p.author_id = $1::uuid
          OR (p.visibility = 'followers' AND EXISTS (SELECT 1 FROM social.follows f WHERE f.following_id = p.author_id AND f.follower_id = $1::uuid))
          OR (p.visibility = 'connections' AND (
                EXISTS (SELECT 1 FROM social.follows f WHERE f.following_id = p.author_id AND f.follower_id = $1::uuid)
                OR EXISTS (SELECT 1 FROM social.follows f WHERE f.follower_id = p.author_id AND f.following_id = $1::uuid)
             ))
        )
        AND (
          $2::text IS NULL
          OR EXISTS (
            SELECT 1
            FROM social.post_hashtags pht
            JOIN social.hashtags h ON h.id = pht.hashtag_id
            WHERE pht.post_id = p.id
              AND h.tag = $2::text
          )
        )
        AND (
          $3::timestamptz IS NULL
          OR p.created_at < $3::timestamptz
          OR (p.created_at = $3::timestamptz AND p.id < $4::uuid)
        )
      GROUP BY p.id, au.id
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $5
      `,
      [
        userId ?? null,
        normalizedHashtag,
        decodedCursor.createdAt,
        decodedCursor.id,
        boundedLimit + 1
      ]
    );

    const hasMore = result.rows.length > boundedLimit;
    const pageRows = hasMore ? result.rows.slice(0, boundedLimit) : result.rows;
    const items = await hydratePosts(client, pageRows);

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({
            createdAt: new Date(lastRow.created_at).toISOString(),
            id: lastRow.id
          })
        : undefined;

    return {
      items,
      nextCursor
    };
  });
};

export const listUserPosts = async ({
  currentUserId,
  profileUserId,
  cursor,
  limit,
  maxLimit
}) => {
  const boundedLimit = Math.min(Math.max(limit, 1), maxLimit);
  const decodedCursor = decodeCursor(cursor);

  return withTransaction(async (client) => {
    const result = await client.query(
      `
      SELECT
        p.id,
        p.author_id AS author_user_id,
        COALESCE(au.full_name, au.display_name) AS author_name,
        au.branch AS author_branch,
        NULLIF(btrim(au.bio), '') AS author_bio,
        p.caption,
        p.visibility,
        p.created_at,
        COUNT(ph.user_id)::int AS hype_count,
        COALESCE(BOOL_OR(ph.user_id = $1::uuid), false) AS is_hyped_by_me
      FROM social.posts p
      JOIN auth.users au ON au.id = p.author_id
      LEFT JOIN social.post_hypes ph ON ph.post_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.author_id = $2::uuid
        AND (
          p.author_id = $1::uuid
          OR p.visibility = 'public'
          OR (
            p.visibility = 'followers'
            AND EXISTS (
              SELECT 1
              FROM social.follows f
              WHERE f.following_id = p.author_id
                AND f.follower_id = $1::uuid
            )
          )
          OR (
            p.visibility = 'connections'
            AND (
              EXISTS (
                SELECT 1
                FROM social.follows f
                WHERE f.following_id = p.author_id
                  AND f.follower_id = $1::uuid
              )
              OR EXISTS (
                SELECT 1
                FROM social.follows f
                WHERE f.follower_id = p.author_id
                  AND f.following_id = $1::uuid
              )
            )
          )
        )
        AND (
          $3::timestamptz IS NULL
          OR p.created_at < $3::timestamptz
          OR (p.created_at = $3::timestamptz AND p.id < $4::uuid)
        )
      GROUP BY p.id, au.id
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $5
      `,
      [
        currentUserId,
        profileUserId,
        decodedCursor.createdAt,
        decodedCursor.id,
        boundedLimit + 1
      ]
    );

    const hasMore = result.rows.length > boundedLimit;
    const pageRows = hasMore ? result.rows.slice(0, boundedLimit) : result.rows;
    const items = await hydratePosts(client, pageRows);

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({
            createdAt: new Date(lastRow.created_at).toISOString(),
            id: lastRow.id
          })
        : undefined;

    return {
      items,
      nextCursor
    };
  });
};

export const getPostById = async ({ postId, userId }) =>
  withTransaction((client) => fetchPostById(client, postId, userId));

export const deletePost = async ({ postId, userId }) => {
  return withTransaction(async (client) => {
    const checkResult = await client.query(
      `SELECT id FROM social.posts WHERE id = $1 AND author_id = $2::uuid`,
      [postId, userId]
    );

    if (!checkResult.rowCount) {
      throw new HttpError(404, "Post not found or unauthorized", "POST_NOT_FOUND");
    }

    // Using DELETE so that ON DELETE CASCADE cleans up hypes, comments, media, and hashtags
    await client.query(`DELETE FROM social.posts WHERE id = $1`, [postId]);
  });
};

export const createPost = async ({ user, caption, media, visibility }) => {
  const sanitizedCaption = caption.trim();
  const validVisibility = ['public', 'followers', 'connections'].includes(visibility) ? visibility : 'public';

  if (!sanitizedCaption) {
    throw new HttpError(400, "caption is required", "INVALID_CAPTION");
  }

  if (sanitizedCaption.length > maxCaptionLength) {
    throw new HttpError(400, "caption exceeds 2000 characters", "INVALID_CAPTION");
  }

  if (!Array.isArray(media) || media.length === 0) {
    throw new HttpError(400, "At least one media item is required", "INVALID_MEDIA");
  }

  return withTransaction(async (client) => {
    const createResult = await client.query(
      `
      INSERT INTO social.posts (author_id, caption, visibility)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [user.id, sanitizedCaption, validVisibility]
    );

    const postId = createResult.rows[0]?.id;

    const hashtags = extractHashtags(sanitizedCaption);
    validateHashtagCount(hashtags);
    await syncPostHashtags(client, postId, hashtags);

    if (Array.isArray(media) && media.length) {
      for (let index = 0; index < media.length; index += 1) {
        const item = media[index];
        await client.query(
          `
          INSERT INTO social.post_media (post_id, uri, media_type, sort_order)
          VALUES ($1, $2, $3, $4)
          `,
          [postId, item.uri, item.mediaType, index]
        );
      }
    }

    return fetchPostById(client, postId, user.id);
  });
};

export const toggleHype = async ({ postId, userId }) =>
  withTransaction(async (client) => {
    await ensurePostExists(client, postId);

    const insertResult = await client.query(
      `
      INSERT INTO social.post_hypes (post_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [postId, userId]
    );

    let isHypedByMe;

    if (insertResult.rowCount) {
      isHypedByMe = true;
    } else {
      await client.query(
        `
        DELETE FROM social.post_hypes
        WHERE post_id = $1
          AND user_id = $2
        `,
        [postId, userId]
      );
      isHypedByMe = false;
    }

    const countResult = await client.query(
      `
      SELECT COUNT(*)::int AS hype_count
      FROM social.post_hypes
      WHERE post_id = $1
      `,
      [postId]
    );

    return {
      postId,
      hypeCount: Number(countResult.rows[0]?.hype_count ?? 0),
      isHypedByMe
    };
  });

export const addComment = async ({ postId, user, body }) => {
  const sanitizedBody = body.trim();

  if (!sanitizedBody) {
    throw new HttpError(400, "comment body is required", "INVALID_COMMENT");
  }

  if (sanitizedBody.length > maxCommentLength) {
    throw new HttpError(400, "comment exceeds 1000 characters", "INVALID_COMMENT");
  }

  return withTransaction(async (client) => {
    await ensurePostExists(client, postId);

    const updateResult = await client.query(
      `
      UPDATE social.comments
      SET
        body = $3,
        updated_at = now()
      WHERE post_id = $1
        AND user_id = $2
      RETURNING id, post_id, user_id, body, created_at
      `,
      [postId, user.id, sanitizedBody]
    );

    if (updateResult.rowCount) {
      return mapComment({ ...updateResult.rows[0], display_name: user.name });
    }

    const insertResult = await client.query(
      `
      INSERT INTO social.comments (post_id, user_id, body)
      VALUES ($1, $2, $3)
      RETURNING id, post_id, user_id, body, created_at
      `,
      [postId, user.id, sanitizedBody]
    );

    return mapComment({ ...insertResult.rows[0], display_name: user.name });
  });
};

export const getTrendingHashtags = async ({ limit }) => {
  const boundedLimit = Math.min(Math.max(limit, 1), 20);

  return withTransaction(async (client) => {
    const result = await client.query(
      `
      SELECT h.tag, COUNT(*)::int AS count
      FROM social.post_hashtags pht
      JOIN social.hashtags h ON h.id = pht.hashtag_id
      JOIN social.posts p ON p.id = pht.post_id
      WHERE p.deleted_at IS NULL
      GROUP BY h.tag
      ORDER BY count DESC, h.tag ASC
      LIMIT $1
      `,
      [boundedLimit]
    );

    return result.rows.map((row) => ({
      tag: row.tag,
      count: Number(row.count)
    }));
  });
};
