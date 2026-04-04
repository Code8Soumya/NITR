import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent
} from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";
import type { AuthGender } from "@/modules/auth/types";
import { AnimatedPressable } from "@/shared/components/AnimatedPressable";
import { appLogger } from "@/shared/utils/logger";

const genderOptions: AuthGender[] = ["male", "female", "other"];
const minimumBirthDate = new Date(1985, 0, 1);
const maximumBirthDate = new Date();

const formatBirthDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizedCalendarDate = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);

export function RegisterScreen() {
  const router = useRouter();
  const { register, busy, error, clearError, isAuthenticated, isApproved } = useAuth();

  const cardEntrance = useRef(new Animated.Value(0)).current;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDateValue, setBirthDateValue] = useState<Date>(() => new Date(2000, 0, 1));
  const [showIosDatePicker, setShowIosDatePicker] = useState(false);
  const [gender, setGender] = useState<AuthGender>("other");
  const [branch, setBranch] = useState("");
  const [bio, setBio] = useState("");
  const [interestsText, setInterestsText] = useState("");
  const [password, setPassword] = useState("");

  const birthDate = useMemo(() => formatBirthDate(birthDateValue), [birthDateValue]);

  useEffect(() => {
    Animated.spring(cardEntrance, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6
    }).start();
  }, [cardEntrance]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (isApproved) {
      router.replace("/(tabs)/hype" as never);
      return;
    }

    router.replace("/(auth)/pending" as never);
  }, [isApproved, isAuthenticated, router]);

  const onBirthDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) {
      return;
    }

    setBirthDateValue(normalizedCalendarDate(selectedDate));
  };

  const openBirthDatePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: birthDateValue,
        mode: "date",
        is24Hour: true,
        minimumDate: minimumBirthDate,
        maximumDate: maximumBirthDate,
        onChange: (event, selectedDate) => {
          if (event.type !== "set" || !selectedDate) {
            return;
          }

          onBirthDateChange(event, selectedDate);
        }
      });

      return;
    }

    setShowIosDatePicker((previous) => !previous);
  };

  const onSubmit = async () => {
    clearError();
    const interests = interestsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const result = await register({
        email,
        password,
        name,
        nickname,
        birthDate,
        gender,
        branch,
        bio,
        interests
      });

      if (result.otpRequired) {
        router.replace(`/(auth)/verify-otp?email=${encodeURIComponent(result.email)}` as never);
      }
    } catch (error) {
      appLogger.error(
        "Register screen submit failed",
        {
          file: "src/modules/auth/screens/RegisterScreen.tsx",
          location: "RegisterScreen.onSubmit",
          action: "submit registration form",
          details: {
            email,
            nickname
          }
        },
        error
      );

      // Error is caught and stored in authStore, UI displays {error}
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <View className="mb-8 mt-6">
            <Text className="text-3xl font-black text-stone-900">Create account</Text>
            <Text className="mt-2 text-base text-stone-700">Only NIT Rourkela emails are accepted.</Text>
          </View>

          <Animated.View
            className="gap-4 rounded-3xl border border-amber-200 bg-white p-5"
            style={{
              opacity: cardEntrance,
              transform: [
                {
                  translateY: cardEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }
              ]
            }}
          >
            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Full name</Text>
              <TextInput
                onChangeText={setName}
                placeholder="Your real name"
                placeholderTextColor="#78716c"
                value={name}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Nickname</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setNickname}
                placeholder="username_for_app"
                placeholderTextColor="#78716c"
                value={nickname}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Birth date</Text>
              <AnimatedPressable
                onPress={openBirthDatePicker}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <Text className="text-base text-stone-900">{birthDate}</Text>
                <Text className="mt-1 text-xs text-stone-500">Tap to pick from calendar</Text>
              </AnimatedPressable>

              {Platform.OS === "ios" && showIosDatePicker ? (
                <View className="mt-3 rounded-2xl border border-amber-200 bg-white p-2">
                  <DateTimePicker
                    mode="date"
                    display="spinner"
                    value={birthDateValue}
                    minimumDate={minimumBirthDate}
                    maximumDate={maximumBirthDate}
                    onChange={onBirthDateChange}
                  />
                </View>
              ) : null}
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Gender</Text>
              <View className="flex-row gap-2">
                {genderOptions.map((option) => {
                  const active = gender === option;
                  return (
                    <AnimatedPressable
                      key={option}
                      onPress={() => setGender(option)}
                      className={`rounded-xl px-3 py-2 ${active ? "bg-rose-600" : "bg-amber-100"}`}
                    >
                      <Text className={`font-semibold ${active ? "text-white" : "text-stone-700"}`}>
                        {option}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Branch</Text>
              <TextInput
                onChangeText={setBranch}
                placeholder="CSE"
                placeholderTextColor="#78716c"
                value={branch}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Bio (optional)</Text>
              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={setBio}
                placeholder="Tell people a little about yourself"
                placeholderTextColor="#78716c"
                textAlignVertical="top"
                value={bio}
                className="min-h-[96px] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
                Interests (optional)
              </Text>
              <TextInput
                onChangeText={setInterestsText}
                placeholder="music, coding, football"
                placeholderTextColor="#78716c"
                value={interestsText}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Email</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="yourid@nitrkl.ac.in"
                placeholderTextColor="#78716c"
                value={email}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Password</Text>
              <TextInput
                secureTextEntry
                onChangeText={setPassword}
                placeholder="Min 8 chars, include upper/lower + number"
                placeholderTextColor="#78716c"
                value={password}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
              />
            </View>

            {error ? <Text className="text-sm text-red-700">{error}</Text> : null}

            <AnimatedPressable
              disabled={busy}
              onPress={onSubmit}
              className="rounded-2xl bg-rose-600 px-4 py-3"
            >
              <Text className="text-center text-base font-bold text-white">
                {busy ? "Creating account..." : "Create account"}
              </Text>
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
        <View className="mb-6 mt-4 flex-row justify-center gap-2">
          <Text className="text-stone-700">Already have an account?</Text>
          <Link href={"/(auth)/login" as never} className="font-semibold text-rose-700">
            Sign in
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
