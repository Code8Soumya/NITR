import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authApi } from "@/modules/auth/api/authApi";
import { appLogger } from "@/shared/utils/logger";

export function VerifyOtpScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();

  const initialEmail = useMemo(
    () => (typeof params.email === "string" ? params.email.trim().toLowerCase() : ""),
    [params.email]
  );

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyOtp = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);

    try {
      await authApi.verifyOtp({
        email,
        code
      });

      setInfo("OTP verified. You can now login.");
      router.replace("/(auth)/login" as never);
    } catch (verifyError) {
      appLogger.error(
        "OTP verification failed",
        {
          file: "src/modules/auth/screens/VerifyOtpScreen.tsx",
          location: "VerifyOtpScreen.verifyOtp",
          action: "verify otp code",
          details: {
            email
          }
        },
        verifyError
      );

      setError(verifyError instanceof Error ? verifyError.message : "OTP verification failed");
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);

    try {
      const result = await authApi.resendOtp({ email });
      const destination = result.delivery?.destination ?? "your email";
      setInfo(`A new OTP was sent to ${destination}.`);
    } catch (resendError) {
      appLogger.error(
        "Resend OTP failed",
        {
          file: "src/modules/auth/screens/VerifyOtpScreen.tsx",
          location: "VerifyOtpScreen.resendOtp",
          action: "resend otp",
          details: {
            email
          }
        },
        resendError
      );

      setError(resendError instanceof Error ? resendError.message : "Failed to resend OTP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-amber-50 px-5 py-6">
      <View className="mb-8 mt-6">
        <Text className="text-3xl font-black text-stone-900">Verify OTP</Text>
        <Text className="mt-2 text-base text-stone-700">
          Enter the OTP code sent by Cognito to your NITR email.
        </Text>
      </View>

      <View className="gap-4 rounded-3xl border border-amber-200 bg-white p-5">
        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="yourid@nitrkl.ac.in"
            placeholderTextColor="#78716c"
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
          />
        </View>

        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">OTP code</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            placeholder="6-digit code"
            placeholderTextColor="#78716c"
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
          />
        </View>

        {info ? <Text className="text-sm text-emerald-700">{info}</Text> : null}
        {error ? <Text className="text-sm text-red-700">{error}</Text> : null}

        <Pressable
          disabled={busy}
          onPress={verifyOtp}
          className="rounded-2xl bg-rose-600 px-4 py-3"
          style={({ pressed }) => ({ opacity: pressed || busy ? 0.85 : 1 })}
        >
          <Text className="text-center text-base font-bold text-white">
            {busy ? "Verifying..." : "Verify OTP"}
          </Text>
        </Pressable>

        <Pressable
          disabled={busy}
          onPress={resendOtp}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3"
          style={({ pressed }) => ({ opacity: pressed || busy ? 0.85 : 1 })}
        >
          <Text className="text-center text-base font-semibold text-stone-700">Resend OTP</Text>
        </Pressable>
      </View>

      <View className="mt-5 flex-row justify-center gap-2">
        <Text className="text-stone-700">Already verified?</Text>
        <Link href={"/(auth)/login" as never} className="font-semibold text-rose-700">
          Sign in
        </Link>
      </View>
    </SafeAreaView>
  );
}
