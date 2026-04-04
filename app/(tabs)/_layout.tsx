import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuth } from "@/modules/auth/hooks/useAuth";

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ color, fontSize: 16 }}>{icon}</Text>;
}

export default function TabsLayout() {
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

  if (!user.isAdmin && user.approvalStatus !== "approved") {
    return <Redirect href={"/(auth)/pending" as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#fffaf2" },
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        tabBarActiveTintColor: "#bf2f50",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 8 }
      }}
    >
      <Tabs.Screen
        name="hype/index"
        options={{
          title: "Hype",
          tabBarLabel: "Hype",
          tabBarIcon: ({ color }) => <TabIcon icon="🔥" color={color} />
        }}
      />
      <Tabs.Screen
        name="campus/index"
        options={{
          title: "Campus",
          tabBarLabel: "Campus",
          tabBarIcon: ({ color }) => <TabIcon icon="🏫" color={color} />
        }}
      />
      <Tabs.Screen
        name="quest/index"
        options={{
          title: "Quest",
          tabBarLabel: "Quest",
          tabBarIcon: ({ color }) => <TabIcon icon="🎯" color={color} />
        }}
      />
      <Tabs.Screen name="hype/create" options={{ href: null, title: "Create Post" }} />
      <Tabs.Screen name="hype/[postId]" options={{ href: null, title: "Post" }} />
      <Tabs.Screen name="hype/profile" options={{ href: null, title: "Profile" }} />
      <Tabs.Screen name="hype/edit-profile" options={{ href: null, title: "Edit Profile" }} />
    </Tabs>
  );
}
