import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";
import { CommentBubble } from "@/modules/hype/components/CommentBubble";
import { PostCard } from "@/modules/hype/components/PostCard";
import { useHypeActions } from "@/modules/hype/hooks/useHypeActions";
import { useHypeStore } from "@/modules/hype/store/hypeStore";

export function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useAuth();
  const posts = useHypeStore((state) => state.posts);
  const { toggleHype, addComment } = useHypeActions();

  const [comment, setComment] = useState("");

  const post = useMemo(() => posts.find((entry) => entry.id === postId), [posts, postId]);

  const myExistingComment = useMemo(() => {
    if (!post || !user?.id) {
      return undefined;
    }

    return post.comments.find((entry) => entry.userId === user.id);
  }, [post, user?.id]);

  useEffect(() => {
    if (myExistingComment) {
      setComment(myExistingComment.body);
    }
  }, [myExistingComment?.id, post?.id]);

  if (!post) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#fffaf2] px-6">
        <Text className="text-lg font-semibold text-slate-900">Post unavailable</Text>
        <Text className="mt-2 text-center text-sm text-slate-500">
          It may have been deleted or not loaded yet.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf2]" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 12, paddingBottom: 30 }}>
        <PostCard
          post={post}
          onOpen={() => {}}
          onToggleHype={() => void toggleHype(post.id)}
        />

        <View className="rounded-2xl bg-white p-4" style={{ elevation: 2 }}>
          <Text className="text-lg font-bold text-slate-900">Comments</Text>
          <Text className="mt-1 text-sm text-slate-500">
            Keep it respectful. Campus code of conduct applies.
          </Text>

          <View className="mt-4">
            {post.comments.length ? (
              post.comments.map((entry) => <CommentBubble key={entry.id} comment={entry} />)
            ) : (
              <Text className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                No comments yet.
              </Text>
            )}
          </View>

          <TextInput
            className="mt-4 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900"
            placeholder={myExistingComment ? "Edit your comment" : "Write a comment"}
            placeholderTextColor="#94a3b8"
            value={comment}
            onChangeText={setComment}
          />

          <Pressable
            className="mt-3 rounded-xl bg-rose-600 px-4 py-3"
            android_ripple={{ color: "#be123c" }}
            onPress={() => {
              const trimmed = comment.trim();
              if (!trimmed) {
                return;
              }

              void addComment({ postId: post.id, body: trimmed });
              setComment(trimmed);
            }}
          >
            <Text className="text-center text-base font-semibold text-white">
              {myExistingComment ? "Update Comment" : "Post Comment"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
