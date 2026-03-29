import { Image, Pressable, Text, View } from "react-native";

import { type HypePost } from "@/modules/hype/types";

type PostCardProps = {
  post: HypePost;
  onOpen: () => void;
  onToggleHype: () => void;
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

export function PostCard({ post, onOpen, onToggleHype }: PostCardProps) {
  const firstMedia = post.media[0];

  return (
    <Pressable
      className="mb-4 rounded-2xl bg-white p-4"
      style={{ elevation: 2 }}
      android_ripple={{ color: "#fdf2f8" }}
      onPress={onOpen}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-base font-bold text-slate-900">{post.authorName}</Text>
          <Text className="text-xs text-slate-500">{post.authorBranch} · {timeAgo(post.createdAt)}</Text>
        </View>
        {firstMedia ? (
          <View className="rounded-full bg-slate-100 px-3 py-1">
            <Text className="text-xs font-semibold text-slate-700">
              {firstMedia.mediaType === "video" ? "VIDEO" : "PHOTO"}
            </Text>
          </View>
        ) : null}
      </View>

      <Text className="mt-3 text-base leading-6 text-slate-800">{post.caption}</Text>

      {firstMedia?.mediaType === "image" ? (
        <Image
          source={{ uri: firstMedia.uri }}
          className="mt-3 h-44 w-full rounded-xl bg-slate-100"
          resizeMode="cover"
        />
      ) : null}

      {post.hashtags.length ? (
        <Text className="mt-3 text-sm text-rose-700">{post.hashtags.join("  ")}</Text>
      ) : null}

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
    </Pressable>
  );
}
