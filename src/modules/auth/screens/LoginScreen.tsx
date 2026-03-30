import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";
import { appLogger } from "@/shared/utils/logger";

export function LoginScreen() {
  const router = useRouter();
  const { login, busy, error, clearError, isAuthenticated, isApproved, isAdmin } = useAuth();

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
    } catch (error) {
      appLogger.error(
        "Login screen submit failed",
        {
          file: "src/modules/auth/screens/LoginScreen.tsx",
          location: "LoginScreen.onSubmit",
          action: "submit login form",
          details: {
            email
          }
        },
        error
      );

      // Error is caught and stored in authStore, so the UI will display it.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-amber-50 px-5 py-6">
      <View className="mb-8 mt-6">
        <Text className="text-4xl font-black text-stone-900">NITR HUB</Text>
        <Text className="mt-2 text-base text-stone-700">
          Login with your NIT Rourkela email to continue.
        </Text>
      </View>

      <View className="gap-4 rounded-3xl border border-amber-200 bg-white p-5">
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
            placeholder="••••••••"
            placeholderTextColor="#78716c"
            value={password}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-900"
          />
        </View>

        {error ? <Text className="text-sm text-red-700">{error}</Text> : null}

        <Pressable
          disabled={busy}
          onPress={onSubmit}
          className="rounded-2xl bg-rose-600 px-4 py-3"
          style={({ pressed }) => ({ opacity: pressed || busy ? 0.85 : 1 })}
        >
          <Text className="text-center text-base font-bold text-white">
            {busy ? "Signing in..." : "Sign in"}
          </Text>
        </Pressable>
      </View>

      <View className="mt-5 flex-row justify-center gap-2">
        <Text className="text-stone-700">New here?</Text>
        <Link href={"/(auth)/register" as never} className="font-semibold text-rose-700">
          Create account
        </Link>
      </View>
    </SafeAreaView>
  );
}
