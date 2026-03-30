import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";

export function ProfileScreen() {
  const { user, busy, error, clearError, updateProfile, logout } = useAuth();

  const initialBio = useMemo(() => user?.bio ?? "", [user?.bio]);
  const initialInterests = useMemo(() => (user?.interests ?? []).join(", "), [user?.interests]);

  const [bio, setBio] = useState(initialBio);
  const [interestsText, setInterestsText] = useState(initialInterests);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setBio(initialBio);
    setInterestsText(initialInterests);
  }, [initialBio, initialInterests]);

  const onSave = async () => {
    clearError();
    setInfo(null);

    const interests = interestsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    await updateProfile({
      bio: bio.trim().length ? bio.trim() : null,
      interests
    });

    setInfo("Profile updated.");
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-amber-50 px-6">
        <Text className="text-base text-stone-700">Profile unavailable. Please login again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-amber-50 px-5 py-6">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl border border-amber-200 bg-white p-5">
          <Text className="text-2xl font-black text-stone-900">My Profile</Text>
          <Text className="mt-1 text-sm text-stone-700">@{user.nickname}</Text>

          <View className="mt-4 gap-2 rounded-2xl bg-amber-50 p-4">
            <Text className="text-sm text-stone-700">Name: {user.name}</Text>
            <Text className="text-sm text-stone-700">Email: {user.email}</Text>
            <Text className="text-sm text-stone-700">Branch: {user.branch}</Text>
            <Text className="text-sm text-stone-700">Gender: {user.gender}</Text>
            <Text className="text-sm text-stone-700">Birth date: {user.birthDate}</Text>
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Bio</Text>
            <TextInput
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={bio}
              onChangeText={setBio}
              placeholder="Add your bio"
              placeholderTextColor="#78716c"
              className="min-h-[96px] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
              Interests (comma separated)
            </Text>
            <TextInput
              value={interestsText}
              onChangeText={setInterestsText}
              placeholder="coding, football, music"
              placeholderTextColor="#78716c"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
            />
          </View>

          {info ? <Text className="mt-3 text-sm text-emerald-700">{info}</Text> : null}
          {error ? <Text className="mt-3 text-sm text-red-700">{error}</Text> : null}

          <Pressable
            disabled={busy}
            onPress={onSave}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-3"
            style={({ pressed }) => ({ opacity: pressed || busy ? 0.85 : 1 })}
          >
            <Text className="text-center text-base font-bold text-white">
              {busy ? "Saving..." : "Save profile"}
            </Text>
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={logout}
            className="mt-3 rounded-2xl border border-stone-300 bg-white px-4 py-3"
            style={({ pressed }) => ({ opacity: pressed || busy ? 0.85 : 1 })}
          >
            <Text className="text-center text-base font-semibold text-stone-700">Sign out</Text>
          </Pressable>

          {user.isAdmin && (
            <Link href={"/(admin)/approvals" as never} asChild>
              <Pressable
                className="mt-6 rounded-2xl bg-stone-800 px-4 py-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="text-center text-base font-bold text-white">
                  Admin Dashboard
                </Text>
              </Pressable>
            </Link>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
