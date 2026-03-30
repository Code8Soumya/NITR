import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HashtagRail } from "@/modules/hype/components/HashtagRail";
import { PostCard } from "@/modules/hype/components/PostCard";
import { useHypeActions } from "@/modules/hype/hooks/useHypeActions";
import { useHypeFeed } from "@/modules/hype/hooks/useHypeFeed";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export function HypeFeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setActiveHashtag, toggleHype } = useHypeActions();
  const {
    visiblePosts,
    isLoading,
    isRefreshing,
    activeHashtag,
    trendingHashtags,
    error,
    refreshFeed
  } = useHypeFeed();

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf2]" edges={["top"]}>
      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshFeed} />}
        ListHeaderComponent={
          <View>
            <View className="rounded-2xl bg-[#171717] p-5" style={{ elevation: 3 }}>
              <Text className="text-xs font-semibold uppercase tracking-[1.8px] text-rose-200">
                Tab 1
              </Text>
              <Text className="mt-2 text-3xl font-extrabold text-white">Hype Feed</Text>
              <Text className="mt-1 text-sm text-rose-100">
                Share moments, media, and hashtags from around campus.
              </Text>
              <Text className="mt-2 text-sm text-rose-100">Logged in as @{user?.nickname ?? "nitr"}</Text>

              <Pressable
                className="mt-4 rounded-xl bg-rose-500 px-4 py-3"
                android_ripple={{ color: "#e11d48" }}
                onPress={() => router.push("/(tabs)/hype/create")}
              >
                <Text className="text-center text-base font-semibold text-white">Create New Post</Text>
              </Pressable>

              <Pressable
                className="mt-3 rounded-xl border border-rose-300 bg-[#262626] px-4 py-3"
                android_ripple={{ color: "#3f3f46" }}
                onPress={() => router.push("/(tabs)/hype/profile")}
              >
                <Text className="text-center text-base font-semibold text-rose-100">Edit Profile</Text>
              </Pressable>
            </View>

            <HashtagRail
              hashtags={trendingHashtags}
              activeHashtag={activeHashtag}
              onSelect={setActiveHashtag}
            />

            {error ? <Text className="mt-3 text-sm text-rose-700">{error}</Text> : null}
            {isLoading ? <Text className="mt-3 text-sm text-slate-500">Loading feed...</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onToggleHype={() => void toggleHype(item.id)}
            onOpen={() => router.push(`/(tabs)/hype/${item.id}`)}
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
