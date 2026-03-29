import { Text, View } from "react-native";

import { type HypeComment } from "@/modules/hype/types";

type CommentBubbleProps = {
  comment: HypeComment;
};

export function CommentBubble({ comment }: CommentBubbleProps) {
  return (
    <View className="mb-2 rounded-xl bg-[#f8fafc] p-3">
      <Text className="text-sm font-semibold text-slate-900">{comment.displayName}</Text>
      <Text className="mt-1 text-sm text-slate-700">{comment.body}</Text>
    </View>
  );
}
