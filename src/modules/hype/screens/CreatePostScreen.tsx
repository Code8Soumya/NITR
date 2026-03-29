import { useState } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useHypeActions } from "@/modules/hype/hooks/useHypeActions";
import { type HypeMediaType } from "@/modules/hype/types";

export function CreatePostScreen() {
  const router = useRouter();
  const { createPost } = useHypeActions();

  const [caption, setCaption] = useState("");
  const [mediaUri, setMediaUri] = useState("");
  const [mediaType, setMediaType] = useState<HypeMediaType>("image");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const publishPost = async () => {
    if (!caption.trim()) {
      setError("Caption is required");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      await createPost({
        caption,
        media: mediaUri.trim()
          ? [
              {
                uri: mediaUri.trim(),
                mediaType
              }
            ]
          : undefined
      });

      router.replace("/(tabs)/hype");
    } catch {
      setError("Unable to publish post right now");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf2]" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text className="text-3xl font-extrabold text-slate-900">Create Hype Post</Text>
          <Text className="mt-1 text-sm text-slate-500">
            Add text plus optional photo/video URL. Hashtags are auto-parsed from caption.
          </Text>

          <View className="mt-6 rounded-2xl bg-white p-4" style={{ elevation: 2 }}>
            <Text className="text-sm font-semibold text-slate-700">Caption</Text>
            <TextInput
              className="mt-2 min-h-28 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900"
              placeholder="What is happening on campus?"
              placeholderTextColor="#94a3b8"
              multiline
              value={caption}
              onChangeText={setCaption}
            />

            <Text className="mt-4 text-sm font-semibold text-slate-700">Media URL (optional)</Text>
            <TextInput
              className="mt-2 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900"
              placeholder="https://..."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              value={mediaUri}
              onChangeText={setMediaUri}
            />

            <Text className="mt-4 text-sm font-semibold text-slate-700">Media Type</Text>
            <View className="mt-2 flex-row gap-2">
              <Pressable
                className={`flex-1 rounded-xl px-3 py-3 ${
                  mediaType === "image" ? "bg-rose-600" : "bg-slate-100"
                }`}
                android_ripple={{ color: "#fecdd3" }}
                onPress={() => setMediaType("image")}
              >
                <Text className={mediaType === "image" ? "text-center font-semibold text-white" : "text-center font-semibold text-slate-700"}>
                  Image
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 rounded-xl px-3 py-3 ${
                  mediaType === "video" ? "bg-rose-600" : "bg-slate-100"
                }`}
                android_ripple={{ color: "#fecdd3" }}
                onPress={() => setMediaType("video")}
              >
                <Text className={mediaType === "video" ? "text-center font-semibold text-white" : "text-center font-semibold text-slate-700"}>
                  Video
                </Text>
              </Pressable>
            </View>

            {error ? <Text className="mt-4 text-sm text-rose-700">{error}</Text> : null}

            <Pressable
              className={`mt-5 rounded-xl px-4 py-3 ${isSubmitting ? "bg-rose-300" : "bg-rose-600"}`}
              android_ripple={{ color: "#be123c" }}
              disabled={isSubmitting}
              onPress={() => void publishPost()}
            >
              <Text className="text-center text-base font-semibold text-white">
                {isSubmitting ? "Publishing..." : "Publish"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
