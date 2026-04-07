import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function CampusPlaceholderScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f4f8ff]">
      <View className="mx-5 mt-10 rounded-2xl bg-background p-5" style={{ elevation: 2 }}>
        <Text className="text-2xl font-heading text-text font-bold font-heading text-slate-900">Campus Utilities</Text>
        <Text className="mt-2 text-base text-slate-600">
          Tab-2 placeholder. This screen remains isolated while Tab-1 is being built.
        </Text>
      </View>
    </SafeAreaView>
  );
}
