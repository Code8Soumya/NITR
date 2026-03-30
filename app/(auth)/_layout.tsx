import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/modules/auth/hooks/useAuth";

export default function AuthLayout() {
  const { bootstrapped } = useAuth();

  if (!bootstrapped) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator size="large" color="#be123c" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
