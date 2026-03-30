import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/modules/auth/hooks/useAuth";
import { appLogger } from "@/shared/utils/logger";

export function PendingApprovalScreen() {
  const router = useRouter();
  const { user, refreshProfile, logout, busy } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-amber-50 px-5 py-6">
      <View className="mt-10 rounded-3xl border border-amber-200 bg-white p-6">
        <Text className="text-2xl font-black text-stone-900">Approval pending</Text>
        <Text className="mt-3 text-base text-stone-700">
          Your account is created, but you can access the app only after admin approval.
        </Text>
        <Text className="mt-2 text-sm text-stone-600">Signed in as: {user?.email ?? "-"}</Text>
      </View>

      <View className="mt-6 gap-3">
        <Pressable
          disabled={busy}
          onPress={refreshProfile}
          className="rounded-2xl bg-rose-600 px-4 py-3"
          style={({ pressed }) => ({ opacity: pressed || busy ? 0.85 : 1 })}
        >
          <Text className="text-center text-base font-bold text-white">Check approval status</Text>
        </Pressable>

        <Pressable
          disabled={busy}
          onPress={async () => {
            try {
              await logout();
            } catch (error) {
              appLogger.error(
                "Pending approval logout failed",
                {
                  file: "src/modules/auth/screens/PendingApprovalScreen.tsx",
                  location: "PendingApprovalScreen.onPress(signOut)",
                  action: "logout from pending state",
                  details: {
                    userId: user?.id
                  }
                },
                error
              );
            } finally {
              router.replace("/(auth)/login" as never);
            }
          }}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3"
          style={({ pressed }) => ({ opacity: pressed || busy ? 0.85 : 1 })}
        >
          <Text className="text-center text-base font-semibold text-stone-700">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
