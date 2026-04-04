import { getRequestContext, requireAdminUser, requireAppUser, requireApprovedUser } from "./lib/auth.js";
import {
  approveUser,
  getUserById,
  listPendingApprovals,
  loginUser,
  refreshTokens,
  registerUser,
  resendUserOtp,
  rejectUser,
  updateUserProfile,
  revokeRefreshSession,
  verifyUserOtp
} from "./lib/authRepository.js";
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
import { logInfo } from "./lib/logger.js";
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
const adminApprovePattern = /^\/api\/v1\/admin\/approvals\/([0-9a-f-]{36})\/approve$/i;
const adminRejectPattern = /^\/api\/v1\/admin\/approvals\/([0-9a-f-]{36})\/reject$/i;

const buildRequestLogContext = (event, method, path) => ({
  file: "backend/tab1-social/src/handler.js",
  location: "handler",
  method,
  path,
  requestId: event?.requestContext?.requestId ?? "unknown",
  sourceIp: event?.requestContext?.http?.sourceIp ?? "unknown"
});

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method ?? "GET";
  const path = normalizePath(event?.rawPath);
  const requestContext = buildRequestLogContext(event, method, path);

  logInfo("Incoming API request", requestContext);

  try {
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

    if (method === "POST" && path === "/api/v1/auth/register") {
      const payload = parseJsonBody(event);
      const context = getRequestContext(event);

      const result = await registerUser({
        email: payload.email,
        password: payload.password,
        name: payload.name,
        nickname: payload.nickname,
        birthDate: payload.birthDate,
        gender: payload.gender,
        bio: payload.bio,
        interests: payload.interests,
        branch: payload.branch,
        context
      });

      return jsonResponse(201, { data: result });
    }

    if (method === "POST" && path === "/api/v1/auth/login") {
      const payload = parseJsonBody(event);
      const context = getRequestContext(event);

      const result = await loginUser({
        email: payload.email,
        password: payload.password,
        context
      });

      return jsonResponse(200, { data: result });
    }

    if (method === "POST" && path === "/api/v1/auth/verify-otp") {
      const payload = parseJsonBody(event);

      const result = await verifyUserOtp({
        email: payload.email,
        code: payload.code
      });

      return jsonResponse(200, { data: result });
    }

    if (method === "POST" && path === "/api/v1/auth/resend-otp") {
      const payload = parseJsonBody(event);

      const result = await resendUserOtp({
        email: payload.email
      });

      return jsonResponse(200, { data: result });
    }

    if (method === "POST" && path === "/api/v1/auth/refresh") {
      const payload = parseJsonBody(event);
      const context = getRequestContext(event);

      const result = await refreshTokens({
        refreshToken: payload.refreshToken,
        context
      });

      return jsonResponse(200, { data: result });
    }

    if (method === "POST" && path === "/api/v1/auth/logout") {
      requireAppUser(event);
      const payload = parseJsonBody(event);

      await revokeRefreshSession({ refreshToken: payload.refreshToken });
      return jsonResponse(200, { data: { success: true } });
    }

    if (method === "GET" && path === "/api/v1/auth/me") {
      const authUser = requireAppUser(event);
      const user = await getUserById({ userId: authUser.id });
      return jsonResponse(200, { data: user });
    }

    if (method === "PUT" && path === "/api/v1/auth/profile") {
      const authUser = requireAppUser(event);
      const payload = parseJsonBody(event);

      const user = await updateUserProfile({
        userId: authUser.id,
        name: payload.name,
        nickname: payload.nickname,
        branch: payload.branch,
        bio: payload.bio,
        interests: payload.interests,
        email: payload.email,
        gender: payload.gender,
        birthDate: payload.birthDate,
        birthdate: payload.birthdate,
        birth_date: payload.birth_date
      });

      return jsonResponse(200, { data: user });
    }

    if (method === "GET" && path === "/api/v1/admin/approvals/pending") {
      requireAdminUser(event);
      const pendingUsers = await listPendingApprovals();
      return jsonResponse(200, { data: pendingUsers });
    }

    const adminApproveMatch = path.match(adminApprovePattern);
    if (method === "POST" && adminApproveMatch) {
      const admin = requireAdminUser(event);
      const userId = adminApproveMatch[1];
      validateUuid(userId, "userId");

      const updated = await approveUser({
        adminUserId: admin.id,
        userId
      });

      return jsonResponse(200, { data: updated });
    }

    const adminRejectMatch = path.match(adminRejectPattern);
    if (method === "POST" && adminRejectMatch) {
      const admin = requireAdminUser(event);
      const userId = adminRejectMatch[1];
      validateUuid(userId, "userId");

      const payload = parseJsonBody(event);
      const updated = await rejectUser({
        adminUserId: admin.id,
        userId,
        reason: payload.reason
      });

      return jsonResponse(200, { data: updated });
    }

    if (method === "GET" && path === "/api/v1/social/posts") {
      const query = event.queryStringParameters ?? {};
      const user = requireApprovedUser(event);

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
      const user = requireApprovedUser(event);
      const payload = parseJsonBody(event);
      const caption = typeof payload.caption === "string" ? payload.caption.trim() : "";

      if (!caption) {
        throw new HttpError(400, "caption is required", "INVALID_CAPTION");
      }

      const media = parseMediaPayload(payload.media);
      if (media.length === 0) {
        throw new HttpError(400, "At least one media item (photo or video) is required", "INVALID_MEDIA");
      }

      const post = await createPost({ user, caption, media });

      return jsonResponse(201, { data: post });
    }

    const singlePostMatch = path.match(singlePostPattern);
    if (method === "GET" && singlePostMatch) {
      const postId = singlePostMatch[1];
      validateUuid(postId, "postId");

      const user = requireApprovedUser(event);
      const post = await getPostById({ postId, userId: user.id });
      return jsonResponse(200, { data: post });
    }

    const hypesMatch = path.match(postHypesPattern);
    if (method === "POST" && hypesMatch) {
      const postId = hypesMatch[1];
      validateUuid(postId, "postId");

      const user = requireApprovedUser(event);
      const result = await toggleHype({ postId, userId: user.id });

      return jsonResponse(200, { data: result });
    }

    const commentsMatch = path.match(postCommentsPattern);
    if (method === "POST" && commentsMatch) {
      const postId = commentsMatch[1];
      validateUuid(postId, "postId");

      const user = requireApprovedUser(event);
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
      const user = requireApprovedUser(event);
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
    return errorResponse(error, requestContext);
  }
};
