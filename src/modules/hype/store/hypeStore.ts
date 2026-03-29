import { create } from "zustand";

import { hypeApi } from "@/modules/hype/api/hypeApi";
import {
  type AddCommentPayload,
  type CreatePostPayload,
  type HypePost
} from "@/modules/hype/types";

type HypeState = {
  posts: HypePost[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoaded: boolean;
  activeHashtag?: string;
  error?: string;
  loadFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  setActiveHashtag: (hashtag?: string) => void;
  createPost: (payload: CreatePostPayload) => Promise<void>;
  toggleHype: (postId: string) => Promise<void>;
  addComment: (payload: AddCommentPayload) => Promise<void>;
};

const sortByCreatedAt = (posts: HypePost[]) =>
  [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const useHypeStore = create<HypeState>((set, get) => ({
  posts: [],
  isLoading: false,
  isRefreshing: false,
  hasLoaded: false,
  activeHashtag: undefined,
  error: undefined,

  loadFeed: async () => {
    set({ isLoading: true, error: undefined });

    try {
      const posts = await hypeApi.getFeed();
      set({ posts: sortByCreatedAt(posts), isLoading: false, hasLoaded: true });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load Hype feed"
      });
    }
  },

  refreshFeed: async () => {
    set({ isRefreshing: true, error: undefined });

    try {
      const posts = await hypeApi.getFeed();
      set({ posts: sortByCreatedAt(posts), isRefreshing: false, hasLoaded: true });
    } catch (error) {
      set({
        isRefreshing: false,
        error: error instanceof Error ? error.message : "Failed to refresh feed"
      });
    }
  },

  setActiveHashtag: (hashtag) => set({ activeHashtag: hashtag }),

  createPost: async (payload) => {
    const { posts } = get();

    try {
      const created = await hypeApi.createPost(payload);
      set({ posts: sortByCreatedAt([created, ...posts]) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not publish post" });
      throw error;
    }
  },

  toggleHype: async (postId) => {
    const current = get().posts;

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

    set({ posts: optimistic });

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
        )
      }));
    } catch {
      set({ posts: current, error: "Hype update failed" });
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
              comments: [...post.comments, comment]
            };
          })
        )
      }));
    } catch {
      set({ error: "Failed to add comment" });
    }
  }
}));
