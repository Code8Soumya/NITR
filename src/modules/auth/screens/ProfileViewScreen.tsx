import { useEffect } from "react";
import { Link, router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";
import { PostCard } from "@/modules/hype/components/PostCard";
import { useHypeStore } from "@/modules/hype/store/hypeStore";
import { AnimatedPressable } from "@/shared/components/AnimatedPressable";

export function ProfileViewScreen() {
  const { user, busy, logout } = useAuth();
  const {
    userPosts,
    isUserPostsLoading,
    userPostsError,
    videoAudioMode,
    loadUserPosts,
    deletePost,
    toggleHype
  } = useHypeStore();

  useEffect(() => {
    if (user?.id) {
      void loadUserPosts(user.id);
    }
  }, [user?.id, loadUserPosts]);

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-amber-50 px-6">
        <Text className="text-base text-stone-700">Profile unavailable. Please login again.</Text>
      </SafeAreaView>
    );
  }

  const bio = user.bio?.trim() || "No bio added yet.";

  return (
    <SafeAreaView className="flex-1 bg-amber-50 px-5 py-6">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-6">
          <View className="h-24 w-24 rounded-full bg-rose-100 items-center justify-center border-4 border-white shadow-sm">
            <Text className="text-3xl font-bold text-rose-600">
              {(user.name || "N")[0].toUpperCase()}
            </Text>
          </View>
          <Text className="mt-3 text-2xl font-black text-stone-900">{user.name}</Text>
          <Text className="mt-1 text-sm font-medium text-stone-500">@{user.nickname}</Text>
        </View>

        <View className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm mb-4">
          <Text className="text-lg font-bold text-stone-800 mb-3">Profile Details</Text>

          <View className="flex-row justify-between py-2 border-b border-stone-200/60">
            <Text className="text-sm font-medium text-stone-500">Branch</Text>
            <Text className="text-sm font-semibold text-stone-800">{user.branch}</Text>
          </View>

          <View className="py-3 border-b border-stone-200/60">
            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">Bio</Text>
            <Text className="text-sm text-stone-700 leading-5">{bio}</Text>
          </View>

          <View className="pt-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Interests</Text>
            {user.interests.length ? (
              <View className="flex-row flex-wrap">
                {user.interests.map((interest) => (
                  <View key={interest} className="mr-2 mb-2 rounded-full bg-rose-50 px-3 py-1.5 border border-rose-100">
                    <Text className="text-xs font-medium text-rose-700">{interest}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-stone-500">No interests added yet.</Text>
            )}
          </View>
        </View>

        <View className="rounded-3xl border border-stone-200 bg-stone-100 p-6 shadow-sm mb-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Account Details (Locked)
          </Text>
          <View className="flex-row justify-between py-2 border-b border-stone-200/60">
            <Text className="text-sm font-medium text-stone-500">Email</Text>
            <Text className="text-sm font-semibold text-stone-800">{user.email}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-stone-200/60">
            <Text className="text-sm font-medium text-stone-500">Gender</Text>
            <Text className="text-sm font-semibold text-stone-800 capitalize">{user.gender}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-sm font-medium text-stone-500">Birth Date</Text>
            <Text className="text-sm font-semibold text-stone-800">{user.birthDate}</Text>
          </View>
        </View>

        <View className="px-1">
          <AnimatedPressable
            onPress={() => router.push("/(tabs)/hype/edit-profile")}
            className="rounded-xl bg-stone-900 px-4 py-3.5 shadow-sm active:bg-stone-800"
          >
            <Text className="text-center text-[15px] font-bold text-white tracking-wide">
              Edit Profile
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            disabled={busy}
            onPress={logout}
            className="mt-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm"
          >
            <Text className="text-center text-[15px] font-semibold text-stone-700">Sign Out</Text>
          </AnimatedPressable>

          {user.isAdmin ? (
            <Link href={"/(admin)/approvals" as never} asChild>
              <AnimatedPressable className="mt-5 rounded-xl bg-indigo-600 px-4 py-3 shadow-sm">
                <Text className="text-center text-[15px] font-bold tracking-wide text-white">
                  Admin Dashboard
                </Text>
              </AnimatedPressable>
            </Link>
          ) : null}
        </View>

        <View className="mt-8 px-1">
          <Text className="text-lg font-bold text-stone-800 mb-4">Your Posts</Text>

          {isUserPostsLoading ? (
            <Text className="mb-3 text-sm text-stone-500">Loading your posts...</Text>
          ) : null}

          {userPostsError ? (
            <Text className="mb-3 text-sm text-rose-600">{userPostsError}</Text>
          ) : null}

          {userPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={() => router.push(`/(tabs)/hype/${post.id}` as never)}
              onToggleHype={() => void toggleHype(post.id)}
              onDelete={() => void deletePost(post.id)}
              isVisible={true}
              videoAudioMode={videoAudioMode}
            />
          ))}

          {!isUserPostsLoading && !userPosts.length ? (
            <Text className="text-sm text-stone-500">No posts yet.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
