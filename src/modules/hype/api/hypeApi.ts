import { initialFeed } from "@/modules/hype/constants/mockFeed";
import {
  type AddCommentPayload,
  type CreatePostPayload,
  type FeedQuery,
  type HypeComment,
  type HypeMediaType,
  type HypePost
} from "@/modules/hype/types";
import { getAspectRatioValueFromLabel } from "@/modules/hype/utils/mediaAspectRatio";
import { tokenStorage } from "@/modules/auth/storage/tokenStorage";
import { appLogger } from "@/shared/utils/logger";

type ToggleHypeResult = {
  postId: string;
  hypeCount: number;
  isHypedByMe: boolean;
};

type MediaUploadPayload = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresIn: number;
};

const CURRENT_USER = {
  id: "user-current",
  name: "You",
  branch: "NITR",
  bio: "Always around campus with a camera and chai."
};

const MAX_HASHTAGS_PER_POST = 5;

const apiBaseUrl = process.env.EXPO_PUBLIC_SOCIAL_API_BASE_URL?.replace(/\/$/, "");

let feedDb: HypePost[] = [...initialFeed];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeHashtags = (caption: string): string[] => {
  const matched = caption.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return Array.from(new Set(matched.map((tag) => tag.toLowerCase())));
};

const validateHashtagLimit = (caption: string): string[] => {
  const hashtags = normalizeHashtags(caption);
  if (hashtags.length > MAX_HASHTAGS_PER_POST) {
    throw new Error(`Use at most ${MAX_HASHTAGS_PER_POST} hashtags in one post`);
  }

  return hashtags;
};

const isRemoteUri = (uri: string): boolean => /^https?:\/\//i.test(uri);

const defaultMimeType = (mediaType: HypeMediaType): string =>
  mediaType === "video" ? "video/mp4" : "image/jpeg";

const inferFileName = (uri: string, mediaType: HypeMediaType): string => {
  const fromUri = uri.split("?")[0]?.split("#")[0]?.split("/").pop()?.trim();
  if (fromUri) {
    return fromUri;
  }

  const extension = mediaType === "video" ? "mp4" : "jpg";
  return `upload-${Date.now()}.${extension}`;
};

const uploadMediaBinary = async ({
  localUri,
  uploadUrl,
  mimeType
}: {
  localUri: string;
  uploadUrl: string;
  mimeType: string;
}): Promise<void> => {
  const localResponse = await fetch(localUri);
  if (!localResponse.ok) {
    throw new Error("Unable to read selected media file");
  }

  const fileBlob = await localResponse.blob();
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType
    },
    body: fileBlob
  });

  if (!uploadResponse.ok) {
    throw new Error(`Media upload failed (${uploadResponse.status})`);
  }
};

const toHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const entries: Record<string, string> = {};
    headers.forEach((value, key) => {
      entries[key] = value;
    });
    return entries;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
};

const devHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};

  const devUserId = process.env.EXPO_PUBLIC_DEV_USER_ID?.trim();
  const devUserName = process.env.EXPO_PUBLIC_DEV_USER_NAME?.trim();
  const devUserBranch = process.env.EXPO_PUBLIC_DEV_USER_BRANCH?.trim();

  if (devUserId) {
    headers["X-Dev-User-Id"] = devUserId;
  }

  if (devUserName) {
    headers["X-Dev-User-Name"] = devUserName;
  }

  if (devUserBranch) {
    headers["X-Dev-User-Branch"] = devUserBranch;
  }

  return headers;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";

  try {
    if (!apiBaseUrl) {
      throw new Error("EXPO_PUBLIC_SOCIAL_API_BASE_URL is not configured");
    }

    const tokens = await tokenStorage.getTokens();

    const mergedHeaders = {
      "Content-Type": "application/json",
      ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...devHeaders(),
      ...toHeaderRecord(init?.headers)
    };

    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: mergedHeaders
    });

    const raw = await response.text();
    const parsed = raw ? (JSON.parse(raw) as { data?: T; error?: { message?: string } }) : {};

    if (!response.ok) {
      throw new Error(parsed.error?.message ?? `Request failed (${response.status})`);
    }

    if (parsed.data === undefined) {
      throw new Error("Malformed API response: missing data");
    }

    return parsed.data;
  } catch (error) {
    appLogger.error(
      "Hype API request failed",
      {
        file: "src/modules/hype/api/hypeApi.ts",
        location: "request",
        action: `${method} ${path}`,
        details: {
          method,
          path,
          usingMockFallback: !apiBaseUrl
        }
      },
      error
    );

    throw error;
  }
}

const mockApi = {
  async getFeed(query?: FeedQuery): Promise<HypePost[]> {
    await sleep(220);

    const base = [...feedDb].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (!query?.hashtag) {
      return base;
    }

    return base.filter((post) => post.hashtags.includes(query.hashtag!));
  },

  async createPost(payload: CreatePostPayload): Promise<HypePost> {
    await sleep(180);

    const hashtags = validateHashtagLimit(payload.caption);

    const post: HypePost = {
      id: `post-${Date.now()}`,
      userId: CURRENT_USER.id,
      authorName: CURRENT_USER.name,
      authorBranch: CURRENT_USER.branch,
      authorBio: CURRENT_USER.bio,
      caption: payload.caption.trim(),
      hashtags,
      createdAt: new Date().toISOString(),
      hypeCount: 0,
      isHypedByMe: false,
      media:
        payload.media.map((item, index) => ({
          id: `media-${Date.now()}-${index}`,
          uri: item.uri,
          mediaType: item.mediaType,
          aspectRatioLabel: item.aspectRatioLabel,
          aspectRatio: item.aspectRatioLabel
            ? getAspectRatioValueFromLabel(item.aspectRatioLabel)
            : undefined
        })),
      comments: []
    };

    feedDb = [post, ...feedDb];
    return post;
  },

  async toggleHype(postId: string): Promise<ToggleHypeResult> {
    await sleep(120);

    let result: ToggleHypeResult = {
      postId,
      hypeCount: 0,
      isHypedByMe: false
    };

    feedDb = feedDb.map((post) => {
      if (post.id !== postId) {
        return post;
      }

      const nextHyped = !post.isHypedByMe;
      const nextCount = nextHyped ? post.hypeCount + 1 : Math.max(0, post.hypeCount - 1);

      result = {
        postId,
        hypeCount: nextCount,
        isHypedByMe: nextHyped
      };

      return {
        ...post,
        isHypedByMe: nextHyped,
        hypeCount: nextCount
      };
    });

    return result;
  },

  async addComment(payload: AddCommentPayload): Promise<HypeComment> {
    await sleep(150);

    const nextCreatedAt = new Date().toISOString();
    const existingComment = feedDb
      .find((post) => post.id === payload.postId)
      ?.comments.find((entry) => entry.userId === CURRENT_USER.id);

    const comment: HypeComment = existingComment
      ? {
          ...existingComment,
          displayName: CURRENT_USER.name,
          body: payload.body.trim(),
          createdAt: nextCreatedAt
        }
      : {
          id: `comment-${Date.now()}`,
          postId: payload.postId,
          userId: CURRENT_USER.id,
          displayName: CURRENT_USER.name,
          body: payload.body.trim(),
          createdAt: nextCreatedAt
        };

    feedDb = feedDb.map((post) => {
      if (post.id !== payload.postId) {
        return post;
      }

      const withoutCurrentUserComment = post.comments.filter(
        (entry) => entry.userId !== CURRENT_USER.id
      );

      return {
        ...post,
        comments: [...withoutCurrentUserComment, comment].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      };
    });

    return comment;
  }
};

export const hypeApi = {
  async getFeed(query?: FeedQuery): Promise<HypePost[]> {
    if (!apiBaseUrl) {
      return mockApi.getFeed(query);
    }

    const params = new URLSearchParams();
    if (query?.hashtag) {
      params.set("hashtag", query.hashtag);
    }

    const suffix = params.size ? `?${params.toString()}` : "";
    const payload = await request<{ items: HypePost[] }>(`/api/v1/social/posts${suffix}`);
    return payload.items;
  },

  async createPost(payload: CreatePostPayload): Promise<HypePost> {
    if (!apiBaseUrl) {
      return mockApi.createPost(payload);
    }

    try {
      validateHashtagLimit(payload.caption);

      const uploadedMedia = await Promise.all(
        payload.media.map(async (item) => {
          if (isRemoteUri(item.uri)) {
            return {
              uri: item.uri,
              mediaType: item.mediaType
            };
          }

          const mimeType = item.mimeType?.trim() || defaultMimeType(item.mediaType);
          const fileName = item.fileName?.trim() || inferFileName(item.uri, item.mediaType);

          const upload = await request<MediaUploadPayload>("/api/v1/social/media/upload-url", {
            method: "POST",
            body: JSON.stringify({
              fileName,
              mimeType,
              mediaType: item.mediaType
            })
          });

          await uploadMediaBinary({
            localUri: item.uri,
            uploadUrl: upload.uploadUrl,
            mimeType
          });

          return {
            uri: upload.publicUrl,
            mediaType: item.mediaType
          };
        })
      );

      return request<HypePost>("/api/v1/social/posts", {
        method: "POST",
        body: JSON.stringify({
          caption: payload.caption,
          media: uploadedMedia
        })
      });
    } catch (error) {
      appLogger.error(
        "Failed to upload media or create post",
        {
          file: "src/modules/hype/api/hypeApi.ts",
          location: "hypeApi.createPost",
          action: "upload media and create post",
          details: {
            mediaCount: payload.media.length
          }
        },
        error
      );

      throw error;
    }
  },

  async toggleHype(postId: string): Promise<ToggleHypeResult> {
    if (!apiBaseUrl) {
      return mockApi.toggleHype(postId);
    }

    return request<ToggleHypeResult>(`/api/v1/social/posts/${encodeURIComponent(postId)}/hypes`, {
      method: "POST"
    });
  },

  async addComment(payload: AddCommentPayload): Promise<HypeComment> {
    if (!apiBaseUrl) {
      return mockApi.addComment(payload);
    }

    return request<HypeComment>(
      `/api/v1/social/posts/${encodeURIComponent(payload.postId)}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body: payload.body })
      }
    );
  }
};
