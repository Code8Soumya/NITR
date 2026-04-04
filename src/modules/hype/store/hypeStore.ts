import { create } from "zustand";

import { hypeApi } from "@/modules/hype/api/hypeApi";
import {
  type AddCommentPayload,
  type CreatePostPayload,
  type HypePost,
  type HypeVideoAudioMode
} from "@/modules/hype/types";
import { appLogger } from "@/shared/utils/logger";

type HypeState = {
  posts: HypePost[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoaded: boolean;
  videoAudioMode: HypeVideoAudioMode;
  activeHashtag?: string;
  error?: string;
  userPosts: HypePost[];
  isUserPostsLoading: boolean;
  userPostsError?: string;
  loadFeed: () => Promise<void>;
  loadUserPosts: (userId: string) => Promise<void>;
  refreshFeed: () => Promise<void>;
  cycleVideoAudioMode: () => void;
  setActiveHashtag: (hashtag?: string) => void;
  createPost: (payload: CreatePostPayload) => Promise<void>;
  toggleHype: (postId: string) => Promise<void>;
  addComment: (payload: AddCommentPayload) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
};

const VIDEO_AUDIO_MODES: HypeVideoAudioMode[] = [
  "forced-muted",
  "start-muted",
  "start-unmuted"
];

const sortByCreatedAt = (posts: HypePost[]) =>
  [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const mergeUpdatedComment = (existingComments: HypePost["comments"], nextComment: HypePost["comments"][number]) => {
  const withoutCurrentUserComment = existingComments.filter(
    (entry) => entry.userId !== nextComment.userId
  );

  return [...withoutCurrentUserComment, nextComment].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

export const useHypeStore = create<HypeState>((set, get) => ({
  posts: [],
  userPosts: [],
  isLoading: false,
  isUserPostsLoading: false,
  isRefreshing: false,
  hasLoaded: false,
  videoAudioMode: "start-muted",
  activeHashtag: undefined,
  error: undefined,
  userPostsError: undefined,

  loadFeed: async () => {
    set({ isLoading: true, error: undefined });

    try {
      const posts = await hypeApi.getFeed();
      set({ posts: sortByCreatedAt(posts), isLoading: false, hasLoaded: true });
    } catch (error) {
      appLogger.error(
        "Failed to load hype feed",
        {
          file: "src/modules/hype/store/hypeStore.ts",
          location: "useHypeStore.loadFeed",
          action: "fetch initial feed"
        },
        error
      );

      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load Hype feed"
      });
    }
  },

  loadUserPosts: async (userId: string) => {
    set({ isUserPostsLoading: true, userPostsError: undefined });

    try {
      const posts = await hypeApi.getUserPosts(userId);
      set({ userPosts: sortByCreatedAt(posts), isUserPostsLoading: false });
    } catch (error) {
      appLogger.error(
        "Failed to load user posts",
        {
          file: "src/modules/hype/store/hypeStore.ts",
          location: "useHypeStore.loadUserPosts",
          action: "fetch user posts"
        },
        error
      );

      set({
        isUserPostsLoading: false,
        userPostsError: error instanceof Error ? error.message : "Failed to load user posts"
      });
    }
  },

  refreshFeed: async () => {
    set({ isRefreshing: true, error: undefined });

    try {
      const posts = await hypeApi.getFeed();
      set({ posts: sortByCreatedAt(posts), isRefreshing: false, hasLoaded: true });
    } catch (error) {
      appLogger.error(
        "Failed to refresh hype feed",
        {
          file: "src/modules/hype/store/hypeStore.ts",
          location: "useHypeStore.refreshFeed",
          action: "refresh feed"
        },
        error
      );

      set({
        isRefreshing: false,
        error: error instanceof Error ? error.message : "Failed to refresh feed"
      });
    }
  },

  cycleVideoAudioMode: () => {
    set((state) => {
      const currentIndex = VIDEO_AUDIO_MODES.indexOf(state.videoAudioMode);
      const nextIndex = (currentIndex + 1) % VIDEO_AUDIO_MODES.length;

      return {
        videoAudioMode: VIDEO_AUDIO_MODES[nextIndex]
      };
    });
  },

  setActiveHashtag: (hashtag) => set({ activeHashtag: hashtag }),

  createPost: async (payload) => {
    const { posts, userPosts } = get();

    try {
      const created = await hypeApi.createPost(payload);
      set({ 
        posts: sortByCreatedAt([created, ...posts]),
        userPosts: sortByCreatedAt([created, ...userPosts])
      });
    } catch (error) {
      appLogger.error(
        "Failed to create hype post",
        {
          file: "src/modules/hype/store/hypeStore.ts",
          location: "useHypeStore.createPost",
          action: "submit post",
          details: {
            mediaCount: payload.media.length,
            captionLength: payload.caption.length
          }
        },
        error
      );

      set({ error: error instanceof Error ? error.message : "Could not publish post" });
      throw error;
    }
  },

  toggleHype: async (postId) => {
    const current = get().posts;
    const currentUserPosts = get().userPosts;

    const optimistic = current.map((post) => {
      if (post.id !== postId) {
        return post;
      }

      const nextHyped = !post.isHypedByMe;
      return {
        ...post,
        isHypedByMe: nextHyped,
        hypeCount: nextHyped ? post.hypeCount + 1 : Math.max(0, post.hypeCount - 1)
      };
    });

    const optimisticUserPosts = currentUserPosts.map((post) => {
      if (post.id !== postId) {
        return post;
      }

      const nextHyped = !post.isHypedByMe;
      return {
        ...post,
        isHypedByMe: nextHyped,
        hypeCount: nextHyped ? post.hypeCount + 1 : Math.max(0, post.hypeCount - 1)
      };
    });

    set({ posts: optimistic, userPosts: optimisticUserPosts });

    try {
      const result = await hypeApi.toggleHype(postId);
      set((state) => ({
        posts: sortByCreatedAt(
          state.posts.map((post) => {
            if (post.id !== result.postId) {
              return post;
            }

            return {
              ...post,
              hypeCount: result.hypeCount,
              isHypedByMe: result.isHypedByMe
            };
          })
        ),
        userPosts: sortByCreatedAt(
          state.userPosts.map((post) => {
            if (post.id !== result.postId) {
              return post;
            }

            return {
              ...post,
              hypeCount: result.hypeCount,
              isHypedByMe: result.isHypedByMe
            };
          })
        )
      }));
    } catch (error) {
      appLogger.error(
        "Failed to toggle hype",
        {
          file: "src/modules/hype/store/hypeStore.ts",
          location: "useHypeStore.toggleHype",
          action: "toggle hype",
          details: {
            postId
          }
        },
        error
      );

      set({ posts: current, userPosts: currentUserPosts, error: "Hype update failed" });
    }
  },

  addComment: async (payload) => {
    if (!payload.body.trim()) {
      return;
    }

    try {
      const comment = await hypeApi.addComment(payload);
      set((state) => ({
        posts: sortByCreatedAt(
          state.posts.map((post) => {
            if (post.id !== payload.postId) {
              return post;
            }

            return {
              ...post,
              comments: mergeUpdatedComment(post.comments, comment)
            };
          })
        ),
        userPosts: sortByCreatedAt(
          state.userPosts.map((post) => {
            if (post.id !== payload.postId) {
              return post;
            }

            return {
              ...post,
              comments: mergeUpdatedComment(post.comments, comment)
            };
          })
        )
      }));
    } catch (error) {
      appLogger.error(
        "Failed to add comment",
        {
          file: "src/modules/hype/store/hypeStore.ts",
          location: "useHypeStore.addComment",
          action: "create comment",
          details: {
            postId: payload.postId
          }
        },
        error
      );

      set({ error: "Failed to add comment" });
    }
  },

  deletePost: async (postId) => {
    const { posts, userPosts } = get();

    // Optimistic delete
    set({
      posts: posts.filter((p) => p.id !== postId),
      userPosts: userPosts.filter((p) => p.id !== postId)
    });

    try {
      await hypeApi.deletePost(postId);
    } catch (error) {
      appLogger.error(
        "Failed to delete post",
        {
          file: "src/modules/hype/store/hypeStore.ts",
          location: "useHypeStore.deletePost",
          action: "delete post",
          details: { postId }
        },
        error
      );

      // Revert optimistic delete on error
      set({ posts, userPosts });
      throw error;
    }
  }
}));
