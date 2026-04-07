import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";
import { AnimatedPressable } from "@/shared/components/AnimatedPressable";

const nicknameRegex = /^[a-z0-9._-]{3,30}$/;

export function ProfileScreen() {
  const { user, busy, error, clearError, updateProfile } = useAuth();

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
        "Username must be 3-30 chars with lowercase letters, numbers, dot, dash, underscore."
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
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-base text-text/80">Profile unavailable. Please login again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-5 py-6">
      <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6">
          <View className="h-24 w-24 rounded-full bg-rose-100 items-center justify-center border-4 border-white shadow-sm">
            <Text className="text-3xl font-bold font-heading text-primary">
              {(name || user.name || "N")[0].toUpperCase()}
            </Text>
          </View>
          <Text className="mt-3 text-2xl font-heading text-text font-black text-text">{name || user.name}</Text>
          <Text className="mt-1 text-sm font-medium text-text/80">@{nickname || user.nickname}</Text>
        </View>

        <View className="rounded-3xl border border-amber-200 bg-background p-6 shadow-sm mb-4">
          <Text className="text-lg font-body text-text font-bold font-heading text-text/80 mb-4">Edit Profile</Text>

          <View className="mt-2">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text/80">Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#a8a29e"
              className="rounded-xl bg-stone-50 px-4 py-3 text-base text-text border border-gray-200 focus:border-primary focus:bg-background"
            />
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text/80">Username</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              value={nickname}
              onChangeText={setNickname}
              placeholder="username"
              placeholderTextColor="#a8a29e"
              className="rounded-xl bg-stone-50 px-4 py-3 text-base text-text border border-gray-200 focus:border-primary focus:bg-background"
            />
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text/80">Branch</Text>
            <TextInput
              value={branch}
              onChangeText={setBranch}
              placeholder="CSE"
              placeholderTextColor="#a8a29e"
              className="rounded-xl bg-stone-50 px-4 py-3 text-base text-text border border-gray-200 focus:border-primary focus:bg-background"
            />
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text/80">Bio</Text>
            <TextInput
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={bio}
              onChangeText={setBio}
              placeholder="Add your bio"
              placeholderTextColor="#a8a29e"
              className="min-h-[100px] rounded-xl bg-stone-50 px-4 py-3 text-base text-text border border-gray-200 focus:border-primary focus:bg-background"
            />
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text/80">
              Interests
            </Text>
            <TextInput
              value={interestsText}
              onChangeText={setInterestsText}
              placeholder="coding, football, music"
              placeholderTextColor="#a8a29e"
              className="rounded-xl bg-stone-50 px-4 py-3 text-base text-text border border-gray-200 focus:border-primary focus:bg-background"
            />
            <Text className="mt-1.5 text-[11px] text-text/80">Separate multiple interests with commas</Text>
          </View>
        </View>

        <View className="rounded-3xl border border-gray-200 bg-stone-100 p-6 shadow-sm mb-6">
          <Text className="text-xs font-bold font-heading uppercase tracking-wider text-text/80 mb-3">
            Account Details (Locked)
          </Text>
          <View className="flex-row justify-between py-2 border-b border-gray-200/60">
            <Text className="text-sm font-medium text-text/80">Email</Text>
            <Text className="text-sm font-semibold text-text/80">{user.email}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-200/60">
            <Text className="text-sm font-medium text-text/80">Gender</Text>
            <Text className="text-sm font-semibold text-text/80 capitalize">{user.gender}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-sm font-medium text-text/80">Birth Date</Text>
            <Text className="text-sm font-semibold text-text/80">{user.birthDate}</Text>
          </View>
        </View>

        <View className="px-1">
          {validationError ? <Text className="mb-4 text-sm text-primary font-medium text-center">{validationError}</Text> : null}

          {info ? (
            <Animated.View
              className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm"
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
              <Text className="text-center text-sm font-semibold text-emerald-700">{info}</Text>
            </Animated.View>
          ) : null}
          {error ? <Text className="mb-4 text-center text-sm font-medium text-primary">{error}</Text> : null}

          <AnimatedPressable
            disabled={busy}
            onPress={onSave}
            className="rounded-xl bg-stone-900 px-4 py-3.5 shadow-sm active:bg-stone-800 cursor-pointer"
          >
            <Text className="text-center text-[15px] font-bold font-heading text-white tracking-wide">
              {busy ? "Saving..." : "Save Profile"}
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
