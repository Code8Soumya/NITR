import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "expo-router";
import { Animated, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";
import { AnimatedPressable } from "@/shared/components/AnimatedPressable";

const nicknameRegex = /^[a-z0-9._-]{3,30}$/;

export function ProfileScreen() {
  const { user, busy, error, clearError, updateProfile, logout } = useAuth();

  const initialName = useMemo(() => user?.name ?? "", [user?.name]);
  const initialNickname = useMemo(() => user?.nickname ?? "", [user?.nickname]);
  const initialBranch = useMemo(() => user?.branch ?? "", [user?.branch]);
  const initialBio = useMemo(() => user?.bio ?? "", [user?.bio]);
  const initialInterests = useMemo(() => (user?.interests ?? []).join(", "), [user?.interests]);

  const [name, setName] = useState(initialName);
  const [nickname, setNickname] = useState(initialNickname);
  const [branch, setBranch] = useState(initialBranch);
  const [bio, setBio] = useState(initialBio);
  const [interestsText, setInterestsText] = useState(initialInterests);
  const [info, setInfo] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const infoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setName(initialName);
    setNickname(initialNickname);
    setBranch(initialBranch);
    setBio(initialBio);
    setInterestsText(initialInterests);
  }, [initialBio, initialBranch, initialInterests, initialName, initialNickname]);

  const animateInfo = (message: string) => {
    setInfo(message);
    infoAnim.setValue(0);

    Animated.timing(infoAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true
    }).start();
  };

  const onSave = async () => {
    clearError();
    setInfo(null);
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedNickname = nickname.trim().toLowerCase();
    const trimmedBranch = branch.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setValidationError("Name must be between 2 and 80 characters.");
      return;
    }

    if (!nicknameRegex.test(trimmedNickname)) {
      setValidationError(
        "Nickname must be 3-30 chars with lowercase letters, numbers, dot, dash, underscore."
      );
      return;
    }

    if (!trimmedBranch.length || trimmedBranch.length > 50) {
      setValidationError("Branch must be between 1 and 50 characters.");
      return;
    }

    const interests = interestsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    await updateProfile({
      name: trimmedName,
      nickname: trimmedNickname,
      branch: trimmedBranch,
      bio: bio.trim().length ? bio.trim() : null,
      interests
    });

    animateInfo("Profile updated.");
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
          <Text className="mt-1 text-sm text-stone-700">@{nickname || user.nickname}</Text>

          <View className="mt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#78716c"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Nickname</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              value={nickname}
              onChangeText={setNickname}
              placeholder="username_for_app"
              placeholderTextColor="#78716c"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Branch</Text>
            <TextInput
              value={branch}
              onChangeText={setBranch}
              placeholder="CSE"
              placeholderTextColor="#78716c"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
            />
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

          <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              Locked fields
            </Text>
            <Text className="mt-2 text-sm text-stone-700">Email: {user.email}</Text>
            <Text className="mt-1 text-sm text-stone-700">Gender: {user.gender}</Text>
            <Text className="mt-1 text-sm text-stone-700">Birth date: {user.birthDate}</Text>
          </View>

          {validationError ? <Text className="mt-3 text-sm text-red-700">{validationError}</Text> : null}

          {info ? (
            <Animated.View
              className="mt-3 rounded-xl bg-emerald-100 px-3 py-2"
              style={{
                opacity: infoAnim,
                transform: [
                  {
                    translateY: infoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0]
                    })
                  }
                ]
              }}
            >
              <Text className="text-sm font-medium text-emerald-700">{info}</Text>
            </Animated.View>
          ) : null}
          {error ? <Text className="mt-3 text-sm text-red-700">{error}</Text> : null}

          <AnimatedPressable
            disabled={busy}
            onPress={onSave}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-3"
          >
            <Text className="text-center text-base font-bold text-white">
              {busy ? "Saving..." : "Save profile"}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            disabled={busy}
            onPress={logout}
            className="mt-3 rounded-2xl border border-stone-300 bg-white px-4 py-3"
          >
            <Text className="text-center text-base font-semibold text-stone-700">Sign out</Text>
          </AnimatedPressable>

          {user.isAdmin && (
            <Link href={"/(admin)/approvals" as never} asChild>
              <AnimatedPressable
                className="mt-6 rounded-2xl bg-stone-800 px-4 py-3"
              >
                <Text className="text-center text-base font-bold text-white">
                  Admin Dashboard
                </Text>
              </AnimatedPressable>
            </Link>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
