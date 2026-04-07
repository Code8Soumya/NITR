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
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

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
    setValidationError("");

    if (!name || !nickname || !birthDate || !gender || !branch || !email || !password) {
      setValidationError("Please fill all required fields");
      return;
    }

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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="mb-4 mt-6 px-5 border-b border-amber-200/50 pb-4 bg-background z-10">
          <Text className="text-3xl font-black text-text">Create account</Text>
          <Text className="mt-2 text-base text-text/80">Only NIT Rourkela emails are accepted</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <Animated.View
            className="gap-4 rounded-3xl border border-amber-200 bg-background p-5"
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
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Full name <Text className="text-primary text-primary" role="alert" aria-live="polite">*</Text></Text>
              <TextInput
                onChangeText={setName}
                placeholder="your real name"
                placeholderTextColor="#78716c"
                value={name}
                className="rounded-2xl border border-amber-200 bg-background px-4 py-3 text-base text-text"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Username <Text className="text-primary text-primary" role="alert" aria-live="polite">*</Text></Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setNickname}
                placeholder="username for app"
                placeholderTextColor="#78716c"
                value={nickname}
                className="rounded-2xl border border-amber-200 bg-background px-4 py-3 text-base text-text"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Birth date <Text className="text-primary text-primary" role="alert" aria-live="polite">*</Text></Text>
              <AnimatedPressable
                onPress={openBirthDatePicker}
                className="rounded-2xl border border-amber-200 bg-background px-4 py-3 cursor-pointer"
              >
                <Text className="text-base text-text">{birthDate}</Text>
              </AnimatedPressable>

              {Platform.OS === "ios" && showIosDatePicker ? (
                <View className="mt-3 rounded-2xl border border-amber-200 bg-background p-2">
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
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Gender <Text className="text-primary text-primary" role="alert" aria-live="polite">*</Text></Text>
              <View className="flex-row gap-2">
                {genderOptions.map((option) => {
                  const active = gender === option;
                  return (
                    <AnimatedPressable
                      key={option}
                      onPress={() => setGender(option)}
                      className={`rounded-xl px-3 py-2 ${active ? "btn-primary bg-cta" : "bg-background"}`}
                    >
                      <Text className={`font-semibold ${active ? "text-white" : "text-text/80"}`}>
                        {option}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Branch <Text className="text-primary text-primary" role="alert" aria-live="polite">*</Text></Text>
              <TextInput
                onChangeText={setBranch}
                placeholder="CSE"
                placeholderTextColor="#78716c"
                value={branch}
                className="rounded-2xl border border-amber-200 bg-background px-4 py-3 text-base text-text"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Bio (optional)</Text>
              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={setBio}
                placeholder="Tell people a little about yourself"
                placeholderTextColor="#78716c"
                textAlignVertical="top"
                value={bio}
                className="min-h-[96px] rounded-2xl border border-amber-200 bg-background px-4 py-3 text-base text-text"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">
                Interests (optional)
              </Text>
              <TextInput
                onChangeText={setInterestsText}
                placeholder="music, coding, football"
                placeholderTextColor="#78716c"
                value={interestsText}
                className="rounded-2xl border border-amber-200 bg-background px-4 py-3 text-base text-text"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Email <Text className="text-primary text-primary" role="alert" aria-live="polite">*</Text></Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="yourid@nitrkl.ac.in"
                placeholderTextColor="#78716c"
                value={email}
                className="rounded-2xl border border-amber-200 bg-background px-4 py-3 text-base text-text"
              />
            </View>

            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Password <Text className="text-primary text-primary" role="alert" aria-live="polite">*</Text></Text>
              <View className="relative justify-center">
                <TextInput
                  secureTextEntry={!showPassword}
                  onChangeText={setPassword}
                  placeholder="Min 8 chars, include upper/lower + num"
                  placeholderTextColor="#78716c"
                  value={password}
                  className="rounded-2xl border border-amber-200 bg-background pl-4 pr-12 py-3 text-base text-text"
                />
                <AnimatedPressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 p-1"
                >
                  <Text className="text-xs font-bold font-heading text-text/80">{showPassword ? "HIDE" : "SHOW"}</Text>
                </AnimatedPressable>
              </View>
            </View>

            {validationError ? <Text className="text-sm text-primary">{validationError}</Text> : null}
            {error ? <Text className="text-sm text-primary">{error}</Text> : null}

            <AnimatedPressable
              disabled={busy}
              onPress={onSubmit}
              className="rounded-2xl btn-primary bg-cta px-4 py-3 cursor-pointer"
            >
              <Text className="text-center text-base font-bold font-heading text-white">
                {busy ? "Creating account..." : "Create account"}
              </Text>
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
        <View className="mb-6 mt-4 flex-row justify-center gap-2">
          <Text className="text-text/80">Already have an account?</Text>
          <Link href={"/(auth)/login" as never} className="font-semibold text-primary">
            Sign in
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
