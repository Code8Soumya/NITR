import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function QuestPlaceholderScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#fff7f2]">
      <View className="mx-5 mt-10 rounded-2xl bg-white p-5" style={{ elevation: 2 }}>
        <Text className="text-2xl font-bold text-slate-900">Daily Quest</Text>
        <Text className="mt-2 text-base text-slate-600">
          Tab-3 placeholder. 1-on-1 quest chat can be implemented independently later.
        </Text>
      </View>
    </SafeAreaView>
  );
}
