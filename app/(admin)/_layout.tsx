import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/modules/auth/hooks/useAuth";

export default function AdminLayout() {
  const { bootstrapped, user } = useAuth();

  if (!bootstrapped) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator size="large" color="#be123c" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={"/(auth)/login" as never} />;
  }

  if (!user.isAdmin) {
    return <Redirect href={"/" as never} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
