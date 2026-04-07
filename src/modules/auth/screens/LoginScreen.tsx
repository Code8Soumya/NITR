import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";
import { AnimatedPressable } from "@/shared/components/AnimatedPressable";

export function LoginScreen() {
  const router = useRouter();
  const { login, busy, error, clearError, isAuthenticated, isApproved } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  const onSubmit = async () => {
    clearError();
    try {
      await login({
        email,
        password
      });
    } catch (e: any) {
      const code = typeof e?.code === "string" ? e.code : "";
      const msg = e instanceof Error ? e.message : String(e);

      if (code === "OTP_VERIFICATION_REQUIRED" || msg.includes("OTP_VERIFICATION_REQUIRED")) {
        router.push({ pathname: "/(auth)/verify-otp", params: { email } });
      }

      if (code === "USER_NOT_FOUND" || msg.includes("USER_NOT_FOUND")) {
        // We override the default store error string to show a cleaner message
        // though authStore will also have its error state populated.
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-5 py-6">
      <View className="mb-8 mt-8">
        <Text className="text-3xl font-black text-text">Welcome back</Text>
        <Text className="mt-2 text-base text-text/80">
          Login with your NIT Rourkela email to continue.
        </Text>
      </View>

      <View className="gap-4 rounded-3xl border border-amber-200 bg-background p-5">
        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Email</Text>
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
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text/80">Password</Text>
          <TextInput
            secureTextEntry
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#78716c"
            value={password}
            className="rounded-2xl border border-amber-200 bg-background px-4 py-3 text-base text-text"
          />
        </View>

        {error ? <Text className="text-sm text-primary">{error}</Text> : null}

        <AnimatedPressable
          disabled={busy}
          onPress={onSubmit}
          className="rounded-2xl btn-primary bg-cta px-4 py-3 cursor-pointer"
        >
          <Text className="text-center text-base font-bold font-heading text-white">
            {busy ? "Signing in..." : "Sign in"}
          </Text>
        </AnimatedPressable>
      </View>

      <View className="mt-5 flex-row justify-center gap-2">
        <Text className="text-text/80">New here?</Text>
        <Link href={"/(auth)/register" as never} className="font-semibold text-primary">
          Create account
        </Link>
      </View>
    </SafeAreaView>
  );
}
