import { useMemo, useState } from "react";
import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Image,
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
import {
  ALLOWED_MEDIA_ASPECT_RATIO_LABELS,
  formatNumericAspectRatio,
  getAspectRatioDimensionsFromLabel,
  getAspectRatioValueFromLabel,
  resolveAllowedAspectRatioLabel,
  type AllowedMediaAspectRatioLabel
} from "@/modules/hype/utils/mediaAspectRatio";
import { appLogger } from "@/shared/utils/logger";

type SelectedMedia = {
  uri: string;
  mediaType: HypeMediaType;
  fileName: string;
  mimeType: string;
  aspectRatioLabel: AllowedMediaAspectRatioLabel;
  aspectRatio: number;
  width: number;
  height: number;
};

const hashtagRegex = /#[A-Za-z0-9_]+/g;
const MAX_HASHTAGS_PER_POST = 5;

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

const countUniqueHashtags = (value: string): number => {
  const matches = value.match(hashtagRegex) ?? [];
  return new Set(matches.map((tag) => tag.toLowerCase())).size;
};

const formatResolution = (width: number, height: number): string => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "Unknown";
  }

  return `${width} x ${height}`;
};

export function CreatePostScreen() {
  const router = useRouter();
  const { createPost } = useHypeActions();
  const allowedAspectLabelText = ALLOWED_MEDIA_ASPECT_RATIO_LABELS.join(", ");

  const [caption, setCaption] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | undefined>(undefined);
  const [selectedPhotoCropRatio, setSelectedPhotoCropRatio] = useState<AllowedMediaAspectRatioLabel>("4:5");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const captionHashtagCount = useMemo(() => countUniqueHashtags(caption), [caption]);

  const ensureMediaLibraryPermission = async (): Promise<boolean> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow gallery access to upload a photo or video");
      return false;
    }

    return true;
  };

  const pickPhoto = async () => {
    setError(undefined);

    try {
      const hasPermission = await ensureMediaLibraryPermission();
      if (!hasPermission) {
        return;
      }

      const [cropWidth, cropHeight] = getAspectRatioDimensionsFromLabel(selectedPhotoCropRatio);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [cropWidth, cropHeight],
        quality: 1
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const picked = result.assets[0];
      const mediaType: HypeMediaType = "image";
      const width = Number(picked.width ?? 0);
      const height = Number(picked.height ?? 0);
      const resolvedAspectRatioLabel = resolveAllowedAspectRatioLabel(width, height);
      const aspectRatioLabel = resolvedAspectRatioLabel ?? selectedPhotoCropRatio;

      const fileName = picked.fileName?.trim() || inferFileName(picked.uri, mediaType);
      const mimeType = picked.mimeType?.trim() || defaultMimeType(mediaType);
      const aspectRatio = getAspectRatioValueFromLabel(aspectRatioLabel);

      setSelectedMedia({
        uri: picked.uri,
        mediaType,
        fileName,
        mimeType,
        aspectRatioLabel,
        aspectRatio,
        width,
        height
      });
    } catch (pickPhotoError) {
      appLogger.error(
        "Failed to pick photo media",
        {
          file: "src/modules/hype/screens/CreatePostScreen.tsx",
          location: "CreatePostScreen.pickPhoto",
          action: "pick photo"
        },
        pickPhotoError
      );

      setError("Unable to open gallery right now");
    }
  };

  const pickVideo = async () => {
    setError(undefined);

    try {
      const hasPermission = await ensureMediaLibraryPermission();
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const picked = result.assets[0];
      const mediaType: HypeMediaType = "video";
      const width = Number(picked.width ?? 0);
      const height = Number(picked.height ?? 0);
      const aspectRatioLabel = resolveAllowedAspectRatioLabel(width, height);

      if (!aspectRatioLabel) {
        setSelectedMedia(undefined);
        setError(
          `Only ${allowedAspectLabelText} ratios are allowed. Current ratio: ${formatNumericAspectRatio(width, height)}`
        );
        return;
      }

      const fileName = picked.fileName?.trim() || inferFileName(picked.uri, mediaType);
      const mimeType = picked.mimeType?.trim() || defaultMimeType(mediaType);
      const aspectRatio = getAspectRatioValueFromLabel(aspectRatioLabel);

      setSelectedMedia({
        uri: picked.uri,
        mediaType,
        fileName,
        mimeType,
        aspectRatioLabel,
        aspectRatio,
        width,
        height
      });
    } catch (pickVideoError) {
      appLogger.error(
        "Failed to pick video media",
        {
          file: "src/modules/hype/screens/CreatePostScreen.tsx",
          location: "CreatePostScreen.pickVideo",
          action: "pick video"
        },
        pickVideoError
      );

      setError("Unable to open gallery right now");
    }
  };

  const publishPost = async () => {
    if (!caption.trim()) {
      setError("Caption is required");
      return;
    }

    if (captionHashtagCount > MAX_HASHTAGS_PER_POST) {
      setError(`Use at most ${MAX_HASHTAGS_PER_POST} hashtags in one post`);
      return;
    }

    if (!selectedMedia) {
      setError("Please select a photo or video");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      await createPost({
        caption,
        media: [
          {
            uri: selectedMedia.uri,
            mediaType: selectedMedia.mediaType,
            fileName: selectedMedia.fileName,
            mimeType: selectedMedia.mimeType,
            aspectRatioLabel: selectedMedia.aspectRatioLabel
          }
        ]
      });

      router.replace("/(tabs)/hype");
    } catch (publishError) {
      appLogger.error(
        "Failed to publish hype post",
        {
          file: "src/modules/hype/screens/CreatePostScreen.tsx",
          location: "CreatePostScreen.publishPost",
          action: "publish post",
          details: {
            captionLength: caption.length,
            mediaUri: selectedMedia.uri,
            mediaType: selectedMedia.mediaType
          }
        },
        publishError
      );

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
            Add text and one photo or video from your gallery. Allowed ratios: {allowedAspectLabelText}.
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
            <Text
              className={`mt-2 text-xs ${
                captionHashtagCount > MAX_HASHTAGS_PER_POST ? "text-rose-700" : "text-slate-500"
              }`}
            >
              Hashtags: {captionHashtagCount}/{MAX_HASHTAGS_PER_POST}
            </Text>

            <Text className="mt-4 text-sm font-semibold text-slate-700">Photo or Video (required)</Text>
            <View className="mt-2 rounded-xl border border-slate-300 p-3">
              <Text className="text-sm font-medium text-slate-700">Photo crop ratio</Text>
              <View className="mt-2 flex-row flex-wrap">
                {ALLOWED_MEDIA_ASPECT_RATIO_LABELS.map((label) => {
                  const selected = selectedPhotoCropRatio === label;

                  return (
                    <Pressable
                      key={label}
                      className={`mr-2 mt-2 rounded-full px-3 py-1.5 ${
                        selected ? "bg-slate-900" : "bg-slate-200"
                      }`}
                      android_ripple={{ color: selected ? "#1e293b" : "#cbd5e1" }}
                      onPress={() => setSelectedPhotoCropRatio(label)}
                    >
                      <Text
                        className={`text-xs font-semibold ${selected ? "text-white" : "text-slate-700"}`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="mt-2 text-xs text-slate-500">
                Selecting a photo opens a crop window using the chosen ratio.
              </Text>

              <View className="mt-3 flex-row">
                <Pressable
                  className="flex-1 rounded-lg bg-slate-800 px-4 py-3"
                  android_ripple={{ color: "#1e293b" }}
                  onPress={() => void pickPhoto()}
                >
                  <Text className="text-center text-sm font-semibold text-white">Choose Photo</Text>
                </Pressable>

                <Pressable
                  className="ml-2 flex-1 rounded-lg bg-slate-700 px-4 py-3"
                  android_ripple={{ color: "#334155" }}
                  onPress={() => void pickVideo()}
                >
                  <Text className="text-center text-sm font-semibold text-white">Choose Video</Text>
                </Pressable>
              </View>

              {selectedMedia ? (
                <>
                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-slate-700">
                      {selectedMedia.mediaType === "video" ? "Video selected" : "Photo selected"}
                    </Text>
                    <Text className="text-xs font-semibold text-slate-500">
                      {selectedMedia.mediaType.toUpperCase()} · {selectedMedia.aspectRatioLabel}
                    </Text>
                  </View>

                  <Text className="mt-2 text-xs text-slate-500">
                    Resolution: {formatResolution(selectedMedia.width, selectedMedia.height)}
                  </Text>

                  {selectedMedia.mediaType === "image" ? (
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      className="mt-3 w-full rounded-lg bg-slate-100"
                      style={{ aspectRatio: selectedMedia.aspectRatio }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Video
                      source={{ uri: selectedMedia.uri }}
                      className="mt-3 w-full overflow-hidden rounded-lg bg-slate-100"
                      style={{ aspectRatio: selectedMedia.aspectRatio }}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                      isMuted
                      isLooping
                    />
                  )}

                  <Text className="mt-2 text-xs text-slate-500" numberOfLines={1}>
                    {selectedMedia.fileName}
                  </Text>

                  <Pressable
                    className="mt-3 rounded-lg bg-slate-200 px-4 py-3"
                    android_ripple={{ color: "#cbd5e1" }}
                    onPress={() => setSelectedMedia(undefined)}
                  >
                    <Text className="text-center text-sm font-semibold text-slate-700">Remove</Text>
                  </Pressable>
                </>
              ) : (
                <Text className="mt-4 text-sm text-slate-500">
                  Choose one photo or video from your gallery. Photos can be cropped to your selected ratio.
                </Text>
              )}
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
