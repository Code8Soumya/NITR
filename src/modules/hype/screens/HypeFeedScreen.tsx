import { useMemo, useRef, useState } from "react";
import { useRouter, Tabs } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View, Alert, type ViewToken } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HashtagRail } from "@/modules/hype/components/HashtagRail";
import { PostCard } from "@/modules/hype/components/PostCard";
import { useHypeActions } from "@/modules/hype/hooks/useHypeActions";
import { useHypeFeed } from "@/modules/hype/hooks/useHypeFeed";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export function HypeFeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [visiblePostIds, setVisiblePostIds] = useState<string[]>([]);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 80
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextVisibleIds = viewableItems
        .map((entry) => {
          const id = entry.item?.id;
          return typeof id === "string" ? id : undefined;
        })
        .filter((id): id is string => Boolean(id));

      setVisiblePostIds(nextVisibleIds);
    }
  );

  const visiblePostIdSet = useMemo(() => new Set(visiblePostIds), [visiblePostIds]);

  const { setActiveHashtag, toggleHype, cycleVideoAudioMode } = useHypeActions();
  const {
    visiblePosts,
    isLoading,
    isRefreshing,
    videoAudioMode,
    activeHashtag,
    trendingHashtags,
    error,
    refreshFeed
  } = useHypeFeed();

  const openOverflowMenu = () => {
    Alert.alert("Account", `Logged in as @${user?.nickname ?? "nitr"}`, [
      {
        text: "Profile",
        onPress: () => router.push("/(tabs)/hype/profile")
      },
      {
        text: "Cancel",
        style: "cancel"
      }
    ]);
  };

  const renderHeaderRight = () => (
    <View className="flex-row items-center space-x-3">
      <Pressable
        onPress={() => cycleVideoAudioMode()}
        className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
        android_ripple={{ color: "#e2e8f0" }}
      >
        <Text className="text-lg font-body text-text">
          {videoAudioMode === "start-unmuted" ? "🔊" : videoAudioMode === "start-muted" ? "🔈" : "🔇"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(tabs)/hype/create")}
        className="h-10 w-10 items-center justify-center rounded-full bg-rose-100"
        android_ripple={{ color: "#fecdd3" }}
      >
        <Text className="text-xl font-heading text-text font-bold font-heading text-primary">+</Text>
      </Pressable>

      <Pressable
        onPress={openOverflowMenu}
        className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 cursor-pointer"
        android_ripple={{ color: "#e2e8f0" }}
      >
        <Text className="text-xl font-heading text-text font-bold font-heading text-slate-700">⋮</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf2]" edges={["top"]}>
      <Tabs.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-[#fffaf2]">
        <Text className="text-2xl font-heading text-text font-extrabold text-primary">Hype</Text>
        {renderHeaderRight()}
      </View>

      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 0, paddingBottom: 24 }}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshFeed} />}
        ListHeaderComponent={
          <View>
            <HashtagRail
              hashtags={trendingHashtags}
              activeHashtag={activeHashtag}
              onSelect={setActiveHashtag}
            />

            {error ? <Text className="mt-3 text-sm text-primary">{error}</Text> : null}
            {isLoading ? <Text className="mt-3 text-sm text-slate-500">Loading feed...</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onToggleHype={() => void toggleHype(item.id)}
            onOpen={() => router.push(`/(tabs)/hype/${item.id}`)}
            isVisible={visiblePostIdSet.has(item.id)}
            videoAudioMode={videoAudioMode}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="mt-16 items-center">
              <Text className="text-base font-semibold text-slate-700">No posts found</Text>
              <Text className="mt-1 text-sm text-slate-500">
                Try switching tags or create the first hype.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
