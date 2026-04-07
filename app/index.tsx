import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/modules/auth/hooks/useAuth";

export default function Index() {
  const { bootstrapped, user } = useAuth();

  if (!bootstrapped) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#be123c" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={"/(auth)/login" as never} />;
  }

  if (user.approvalStatus !== "approved" && !user.isAdmin) {
    return <Redirect href={"/(auth)/pending" as never} />;
  }

  return <Redirect href={"/(tabs)/hype" as never} />;
}
