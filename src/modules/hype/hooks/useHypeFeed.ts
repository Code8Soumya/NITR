import { useEffect, useMemo } from "react";

import { useHypeStore } from "@/modules/hype/store/hypeStore";

export function useHypeFeed() {
  const posts = useHypeStore((state) => state.posts);
  const isLoading = useHypeStore((state) => state.isLoading);
  const isRefreshing = useHypeStore((state) => state.isRefreshing);
  const hasLoaded = useHypeStore((state) => state.hasLoaded);
  const videoAudioMode = useHypeStore((state) => state.videoAudioMode);
  const activeHashtag = useHypeStore((state) => state.activeHashtag);
  const error = useHypeStore((state) => state.error);
  const loadFeed = useHypeStore((state) => state.loadFeed);
  const refreshFeed = useHypeStore((state) => state.refreshFeed);

  useEffect(() => {
    if (!hasLoaded && !isLoading) {
      void loadFeed();
    }
  }, [hasLoaded, isLoading, loadFeed]);

  const visiblePosts = useMemo(() => {
    if (!activeHashtag) {
      return posts;
    }

    return posts.filter((post) => post.hashtags.includes(activeHashtag));
  }, [activeHashtag, posts]);

  const trendingHashtags = useMemo(() => {
    const hashtagCount = new Map<string, number>();

    for (const post of posts) {
      for (const tag of post.hashtags) {
        hashtagCount.set(tag, (hashtagCount.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(hashtagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts]);

  return {
    visiblePosts,
    isLoading,
    isRefreshing,
    videoAudioMode,
    activeHashtag,
    trendingHashtags,
    error,
    refreshFeed
  };
}
