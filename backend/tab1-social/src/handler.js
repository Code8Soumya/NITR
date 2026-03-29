import { requireUser } from "./lib/auth.js";
import { HttpError } from "./lib/errors.js";
import { normalizeHashtag } from "./lib/hashtags.js";
import {
  errorResponse,
  jsonResponse,
  noContentResponse,
  normalizePath,
  parseJsonBody,
  parsePositiveInt
} from "./lib/http.js";
import { createMediaUploadUrl } from "./lib/media.js";
import {
  addComment,
  createPost,
  getPostById,
  getTrendingHashtags,
  listFeed,
  toggleHype
} from "./lib/socialRepository.js";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateUuid = (value, fieldName) => {
  if (!uuidRegex.test(value)) {
    throw new HttpError(400, `${fieldName} must be a UUID`, "INVALID_ID");
  }
};

const parseMediaPayload = (media) => {
  if (media === undefined || media === null) {
    return [];
  }

  if (!Array.isArray(media)) {
    throw new HttpError(400, "media must be an array", "INVALID_MEDIA");
  }

  return media.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new HttpError(400, `media[${index}] must be an object`, "INVALID_MEDIA");
    }

    const uri = typeof item.uri === "string" ? item.uri.trim() : "";
    if (!uri) {
      throw new HttpError(400, `media[${index}].uri is required`, "INVALID_MEDIA");
    }

    if (item.mediaType !== "image" && item.mediaType !== "video") {
      throw new HttpError(
        400,
        `media[${index}].mediaType must be image or video`,
        "INVALID_MEDIA"
      );
    }

    return {
      uri,
      mediaType: item.mediaType
    };
  });
};

const defaultFeedLimit = Number.parseInt(process.env.DEFAULT_FEED_LIMIT ?? "20", 10);
const maxFeedLimit = Number.parseInt(process.env.MAX_FEED_LIMIT ?? "50", 10);

const postHypesPattern = /^\/api\/v1\/social\/posts\/([0-9a-f-]{36})\/hypes$/i;
const postCommentsPattern = /^\/api\/v1\/social\/posts\/([0-9a-f-]{36})\/comments$/i;
const singlePostPattern = /^\/api\/v1\/social\/posts\/([0-9a-f-]{36})$/i;

export const handler = async (event) => {
  try {
    const method = event?.requestContext?.http?.method ?? "GET";
    const path = normalizePath(event?.rawPath);

    if (method === "OPTIONS") {
      return noContentResponse();
    }

    if (method === "GET" && path === "/api/v1/social/health") {
      return jsonResponse(200, {
        data: {
          service: "tab1-social",
          status: "ok",
          timestamp: new Date().toISOString()
        }
      });
    }

    if (method === "GET" && path === "/api/v1/social/posts") {
      const query = event.queryStringParameters ?? {};
      const user = requireUser(event);

      const limit = parsePositiveInt({
        value: query.limit,
        field: "limit",
        fallback: defaultFeedLimit,
        min: 1,
        max: maxFeedLimit
      });

      const hashtag = query.hashtag ? normalizeHashtag(query.hashtag) : undefined;
      const feed = await listFeed({
        userId: user.id,
        hashtag,
        cursor: query.cursor,
        limit,
        maxLimit: maxFeedLimit
      });

      return jsonResponse(200, { data: feed });
    }

    if (method === "POST" && path === "/api/v1/social/posts") {
      const user = requireUser(event);
      const payload = parseJsonBody(event);
      const caption = typeof payload.caption === "string" ? payload.caption.trim() : "";

      if (!caption) {
        throw new HttpError(400, "caption is required", "INVALID_CAPTION");
      }

      const media = parseMediaPayload(payload.media);
      const post = await createPost({ user, caption, media });

      return jsonResponse(201, { data: post });
    }

    const singlePostMatch = path.match(singlePostPattern);
    if (method === "GET" && singlePostMatch) {
      const postId = singlePostMatch[1];
      validateUuid(postId, "postId");

      const user = requireUser(event);
      const post = await getPostById({ postId, userId: user.id });
      return jsonResponse(200, { data: post });
    }

    const hypesMatch = path.match(postHypesPattern);
    if (method === "POST" && hypesMatch) {
      const postId = hypesMatch[1];
      validateUuid(postId, "postId");

      const user = requireUser(event);
      const result = await toggleHype({ postId, userId: user.id });

      return jsonResponse(200, { data: result });
    }

    const commentsMatch = path.match(postCommentsPattern);
    if (method === "POST" && commentsMatch) {
      const postId = commentsMatch[1];
      validateUuid(postId, "postId");

      const user = requireUser(event);
      const payload = parseJsonBody(event);
      const body = typeof payload.body === "string" ? payload.body.trim() : "";

      if (!body) {
        throw new HttpError(400, "body is required", "INVALID_COMMENT");
      }

      const comment = await addComment({ postId, user, body });
      return jsonResponse(201, { data: comment });
    }

    if (method === "GET" && path === "/api/v1/social/hashtags/trending") {
      const query = event.queryStringParameters ?? {};
      const limit = parsePositiveInt({
        value: query.limit,
        field: "limit",
        fallback: 10,
        min: 1,
        max: 20
      });

      const hashtags = await getTrendingHashtags({ limit });
      return jsonResponse(200, { data: hashtags });
    }

    if (method === "POST" && path === "/api/v1/social/media/upload-url") {
      const user = requireUser(event);
      const payload = parseJsonBody(event);

      const fileName = typeof payload.fileName === "string" ? payload.fileName.trim() : "";
      const mimeType =
        typeof payload.mimeType === "string" && payload.mimeType.trim().length
          ? payload.mimeType.trim()
          : undefined;
      const mediaType = payload.mediaType;

      const upload = await createMediaUploadUrl({
        userId: user.id,
        fileName,
        mimeType,
        mediaType
      });

      return jsonResponse(200, { data: upload });
    }

    throw new HttpError(404, `Route not found: ${method} ${path}`, "NOT_FOUND");
  } catch (error) {
    return errorResponse(error);
  }
};
