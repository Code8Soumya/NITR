import { Pressable, ScrollView, Text, View } from "react-native";

type HashtagRailProps = {
  activeHashtag?: string;
  hashtags: { tag: string; count: number }[];
  onSelect: (tag?: string) => void;
};

export function HashtagRail({ activeHashtag, hashtags, onSelect }: HashtagRailProps) {
  return (
    <View>
      <Text className="mb-2 mt-0 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Trending tags
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2 pb-2">
          <Pressable
            className={`rounded-full border px-4 py-2 ${
              !activeHashtag ? "border-primary btn-primary bg-cta" : "border-slate-300 bg-background"
            }`}
            android_ripple={{ color: "#fecdd3" }}
            onPress={() => onSelect(undefined)}
          >
            <Text className={!activeHashtag ? "text-white" : "text-slate-700"}>All</Text>
          </Pressable>

          {hashtags.map((item) => (
            <Pressable
              key={item.tag}
              className={`rounded-full border px-4 py-2 ${
                activeHashtag === item.tag
                  ? "border-primary btn-primary bg-cta"
                  : "border-slate-300 bg-background"
              }`}
              android_ripple={{ color: "#fecdd3" }}
              onPress={() => onSelect(item.tag)}
            >
              <Text className={activeHashtag === item.tag ? "text-white" : "text-slate-700"}>
                {item.tag} · {item.count}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
