import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ color, fontSize: 16 }}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#fffaf2" },
        headerTitleStyle: { fontWeight: "700" },
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
    </Tabs>
  );
}
