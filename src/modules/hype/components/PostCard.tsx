import { useEffect, useMemo, useRef, useState } from "react";
import { type AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { Image, Pressable, Text, View } from "react-native";

import { type HypePost } from "@/modules/hype/types";
import {
  getAspectRatioValueFromLabel,
  resolveAllowedAspectRatioLabel
} from "@/modules/hype/utils/mediaAspectRatio";

type PostCardProps = {
  post: HypePost;
  onOpen: () => void;
  onToggleHype: () => void;
  isVisible?: boolean;
  disableAutoPlay?: boolean;
};

const timeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const normalizeRenderableUri = (uri: string): string => {
  const trimmed = uri.trim();
  if (!trimmed) {
    return "";
  }

  if (/^(https?:\/\/|file:\/\/|content:\/\/|data:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
};

const getInitialAspectRatio = (post: HypePost): number => {
  const firstMedia = post.media[0];

  if (!firstMedia) {
    return 4 / 5;
  }

  if (typeof firstMedia.aspectRatio === "number" && Number.isFinite(firstMedia.aspectRatio)) {
    return firstMedia.aspectRatio;
  }

  if (firstMedia.aspectRatioLabel) {
    return getAspectRatioValueFromLabel(firstMedia.aspectRatioLabel);
  }

  return firstMedia.mediaType === "video" ? 9 / 16 : 4 / 5;
};

const normalizeMeasuredAspectRatio = (width: number, height: number): number | undefined => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return undefined;
  }

  const allowedLabel = resolveAllowedAspectRatioLabel(width, height);
  if (allowedLabel) {
    return getAspectRatioValueFromLabel(allowedLabel);
  }

  return width / height;
};

export function PostCard({
  post,
  onOpen,
  onToggleHype,
  isVisible = true,
  disableAutoPlay = false
}: PostCardProps) {
  const firstMedia = post.media[0];
  const showVideo = firstMedia?.mediaType === "video";
  const showImage = firstMedia?.mediaType === "image";
  const videoRef = useRef<Video | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState(() => getInitialAspectRatio(post));
  const [isMuted, setIsMuted] = useState(true);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const imageUri = useMemo(() => {
    if (!firstMedia || firstMedia.mediaType !== "image") {
      return "";
    }

    return normalizeRenderableUri(firstMedia.uri);
  }, [firstMedia]);

  const videoUri = useMemo(() => {
    if (!firstMedia || firstMedia.mediaType !== "video") {
      return "";
    }

    return normalizeRenderableUri(firstMedia.uri);
  }, [firstMedia]);

  useEffect(() => {
    setImageLoadFailed(false);
    setVideoLoadFailed(false);
    setMediaAspectRatio(getInitialAspectRatio(post));
    setIsMuted(true);
    setIsPausedByUser(false);
    setIsVideoPlaying(false);
  }, [post]);

  useEffect(() => {
    if (!imageUri || firstMedia?.mediaType !== "image") {
      return;
    }

    Image.getSize(
      imageUri,
      (width, height) => {
        const nextAspectRatio = normalizeMeasuredAspectRatio(width, height);
        if (nextAspectRatio) {
          setMediaAspectRatio(nextAspectRatio);
        }
      },
      () => {
        // Preserve fallback ratio when dimensions cannot be measured.
      }
    );
  }, [firstMedia?.mediaType, imageUri]);

  useEffect(() => {
    if (!showVideo) {
      return;
    }

    if (!isVisible || disableAutoPlay) {
      void videoRef.current?.pauseAsync();
      return;
    }

    setIsPausedByUser(false);
    setIsMuted(true);
    void videoRef.current?.setIsMutedAsync(true);
    void videoRef.current?.playAsync();
  }, [disableAutoPlay, isVisible, showVideo]);

  const shouldPlayVideo = showVideo && isVisible && !disableAutoPlay && !isPausedByUser;
  const authorBioPreview = post.authorBio?.trim() || "No bio added yet";

  return (
    <Pressable
      className="mb-4 overflow-hidden rounded-2xl bg-white"
      style={{ elevation: 2 }}
      android_ripple={{ color: "#fdf2f8" }}
      onPress={onOpen}
    >
      <View className="flex-row items-center justify-between px-4 pt-4">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-slate-900">{post.authorName}</Text>
          <Text className="text-xs text-slate-500">{post.authorBranch} · {timeAgo(post.createdAt)}</Text>
          <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
            {authorBioPreview}
          </Text>
        </View>
        {firstMedia ? (
          <View className="rounded-full bg-slate-100 px-3 py-1">
            <Text className="text-xs font-semibold text-slate-700">
              {firstMedia.mediaType === "video" ? "VIDEO" : "PHOTO"}
            </Text>
          </View>
        ) : null}
      </View>

      {showImage && imageUri && !imageLoadFailed ? (
        <View className="mt-3 overflow-hidden bg-slate-100" style={{ aspectRatio: mediaAspectRatio }}>
          <Image
            source={{ uri: imageUri }}
            className="h-full w-full"
            resizeMode="contain"
            onError={() => setImageLoadFailed(true)}
          />
        </View>
      ) : null}

      {showImage && (!imageUri || imageLoadFailed) ? (
        <View className="mt-3 bg-slate-100 p-3">
          <Text className="text-sm text-slate-600">Photo unavailable for preview</Text>
        </View>
      ) : null}

      {showVideo && videoUri && !videoLoadFailed ? (
        <View className="relative mt-3 overflow-hidden bg-slate-900" style={{ aspectRatio: mediaAspectRatio }}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            className="h-full w-full"
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={shouldPlayVideo}
            isLooping
            isMuted={isMuted}
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
              if (!status.isLoaded) {
                return;
              }

              setIsVideoPlaying(status.isPlaying);
            }}
            onReadyForDisplay={(event) => {
              const width = Number(event.naturalSize?.width ?? 0);
              const height = Number(event.naturalSize?.height ?? 0);
              const nextAspectRatio = normalizeMeasuredAspectRatio(width, height);

              if (nextAspectRatio) {
                setMediaAspectRatio(nextAspectRatio);
              }
            }}
            onError={() => {
              setVideoLoadFailed(true);
            }}
          />

          <View className="absolute bottom-3 right-3 flex-row">
            <Pressable
              className="rounded-full bg-black/70 px-3 py-1"
              android_ripple={{ color: "#334155" }}
              onPress={(event) => {
                event.stopPropagation();
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                void videoRef.current?.setIsMutedAsync(nextMuted);
              }}
            >
              <Text className="text-xs font-semibold text-white">{isMuted ? "Unmute" : "Mute"}</Text>
            </Pressable>

            <Pressable
              className="ml-2 rounded-full bg-black/70 px-3 py-1"
              android_ripple={{ color: "#334155" }}
              onPress={(event) => {
                event.stopPropagation();

                const nextPausedState = !isPausedByUser;
                setIsPausedByUser(nextPausedState);

                if (nextPausedState) {
                  void videoRef.current?.pauseAsync();
                } else {
                  void videoRef.current?.playAsync();
                }
              }}
            >
              <Text className="text-xs font-semibold text-white">
                {isPausedByUser || !isVideoPlaying ? "Play" : "Pause"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showVideo && (!videoUri || videoLoadFailed) ? (
        <View className="mt-3 bg-slate-100 p-3">
          <Text className="text-sm text-slate-600">Video unavailable for preview</Text>
        </View>
      ) : null}

      <View className="px-4 pb-4 pt-3">
        <Text className="text-sm leading-5 text-slate-800" numberOfLines={2}>
          {post.caption}
        </Text>

        <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
        <Pressable
          className={`rounded-full px-4 py-2 ${post.isHypedByMe ? "bg-rose-600" : "bg-slate-100"}`}
          android_ripple={{ color: "#fecdd3" }}
          onPress={(event) => {
            event.stopPropagation();
            onToggleHype();
          }}
        >
          <Text className={post.isHypedByMe ? "font-semibold text-white" : "font-semibold text-slate-700"}>
            {post.isHypedByMe ? "Hyped" : "Hype"} · {post.hypeCount}
          </Text>
        </Pressable>

        <Text className="text-sm font-medium text-slate-600">Comments · {post.comments.length}</Text>
        </View>
      </View>
    </Pressable>
  );
}
