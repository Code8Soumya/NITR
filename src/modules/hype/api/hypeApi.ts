import { initialFeed } from "@/modules/hype/constants/mockFeed";
import {
  type AddCommentPayload,
  type CreatePostPayload,
  type FeedQuery,
  type HypeComment,
  type HypePost
} from "@/modules/hype/types";

type ToggleHypeResult = {
  postId: string;
  hypeCount: number;
  isHypedByMe: boolean;
};

const CURRENT_USER = {
  id: "user-current",
  name: "You",
  branch: "NITR"
};

const apiBaseUrl = process.env.EXPO_PUBLIC_SOCIAL_API_BASE_URL?.replace(/\/$/, "");

let feedDb: HypePost[] = [...initialFeed];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeHashtags = (caption: string): string[] => {
  const matched = caption.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return Array.from(new Set(matched.map((tag) => tag.toLowerCase())));
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
  if (!apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_SOCIAL_API_BASE_URL is not configured");
  }

  const mergedHeaders = {
    "Content-Type": "application/json",
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

    const hashtags = normalizeHashtags(payload.caption);

    const post: HypePost = {
      id: `post-${Date.now()}`,
      userId: CURRENT_USER.id,
      authorName: CURRENT_USER.name,
      authorBranch: CURRENT_USER.branch,
      caption: payload.caption.trim(),
      hashtags,
      createdAt: new Date().toISOString(),
      hypeCount: 0,
      isHypedByMe: false,
      media:
        payload.media?.map((item, index) => ({
          id: `media-${Date.now()}-${index}`,
          uri: item.uri,
          mediaType: item.mediaType
        })) ?? [],
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

    const comment: HypeComment = {
      id: `comment-${Date.now()}`,
      postId: payload.postId,
      userId: CURRENT_USER.id,
      displayName: CURRENT_USER.name,
      body: payload.body.trim(),
      createdAt: new Date().toISOString()
    };

    feedDb = feedDb.map((post) => {
      if (post.id !== payload.postId) {
        return post;
      }

      return {
        ...post,
        comments: [...post.comments, comment]
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

    return request<HypePost>("/api/v1/social/posts", {
      method: "POST",
      body: JSON.stringify(payload)
    });
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
