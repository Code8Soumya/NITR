import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authApi } from "@/modules/auth/api/authApi";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import type { AuthUser } from "@/modules/auth/types";
import { AnimatedPressable } from "@/shared/components/AnimatedPressable";
import { appLogger } from "@/shared/utils/logger";

export function AdminApprovalsScreen() {
  const { user, tokens, logout } = useAuth();

  const [pendingUsers, setPendingUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const loadPending = useCallback(async () => {
    if (!tokens?.accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const users = await authApi.getPendingApprovals(tokens.accessToken);
      setPendingUsers(users);
    } catch (loadError) {
      appLogger.error(
        "Failed to load pending approvals",
        {
          file: "src/modules/auth/screens/AdminApprovalsScreen.tsx",
          location: "AdminApprovalsScreen.loadPending",
          action: "fetch pending approvals"
        },
        loadError
      );

      setError(loadError instanceof Error ? loadError.message : "Failed to load pending users");
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const approve = async (targetUserId: string) => {
    if (!tokens?.accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.approveUser(tokens.accessToken, targetUserId);
      await loadPending();
    } catch (approveError) {
      appLogger.error(
        "Failed to approve pending user",
        {
          file: "src/modules/auth/screens/AdminApprovalsScreen.tsx",
          location: "AdminApprovalsScreen.approve",
          action: "approve user",
          details: {
            targetUserId
          }
        },
        approveError
      );

      setError(approveError instanceof Error ? approveError.message : "Approval failed");
      setLoading(false);
    }
  };

  const reject = async (targetUserId: string) => {
    if (!tokens?.accessToken) {
      return;
    }

    const reason = reasons[targetUserId] ?? "Rejected by admin";

    setLoading(true);
    setError(null);

    try {
      await authApi.rejectUser(tokens.accessToken, targetUserId, reason);
      await loadPending();
    } catch (rejectError) {
      appLogger.error(
        "Failed to reject pending user",
        {
          file: "src/modules/auth/screens/AdminApprovalsScreen.tsx",
          location: "AdminApprovalsScreen.reject",
          action: "reject user",
          details: {
            targetUserId,
            reason
          }
        },
        rejectError
      );

      setError(rejectError instanceof Error ? rejectError.message : "Rejection failed");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <View className="border-b border-amber-200 bg-white px-5 py-4">
        <Text className="text-2xl font-black text-stone-900">Admin approvals</Text>
        <Text className="mt-1 text-sm text-stone-700">Admin: {user?.email ?? "unknown"}</Text>
      </View>

      <View className="flex-row gap-3 px-5 py-4">
        <AnimatedPressable
          onPress={loadPending}
          disabled={loading}
          className="rounded-xl bg-rose-600 px-4 py-2"
        >
          <Text className="font-semibold text-white">Refresh list</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={logout}
          disabled={loading}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2"
        >
          <Text className="font-semibold text-stone-700">Sign out</Text>
        </AnimatedPressable>
      </View>

      {error ? <Text className="px-5 pb-2 text-sm text-red-700">{error}</Text> : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
        {pendingUsers.length === 0 && !loading ? (
          <View className="rounded-2xl border border-amber-200 bg-white p-4">
            <Text className="text-stone-700">No pending approvals right now.</Text>
          </View>
        ) : null}

        {pendingUsers.map((pendingUser) => (
          <View key={pendingUser.id} className="mb-4 rounded-2xl border border-amber-200 bg-white p-4">
            <Text className="text-base font-bold text-stone-900">@{pendingUser.nickname}</Text>
            <Text className="mt-1 text-sm text-stone-700">Name: {pendingUser.name}</Text>
            <Text className="mt-1 text-sm text-stone-700">{pendingUser.email}</Text>
            <Text className="mt-1 text-sm text-stone-700">Branch: {pendingUser.branch}</Text>

            <TextInput
              value={reasons[pendingUser.id] ?? ""}
              onChangeText={(value) =>
                setReasons((prev) => ({
                  ...prev,
                  [pendingUser.id]: value
                }))
              }
              placeholder="Optional rejection reason"
              placeholderTextColor="#78716c"
              className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-stone-900"
            />

            <View className="mt-3 flex-row gap-3">
              <AnimatedPressable
                onPress={() => void approve(pendingUser.id)}
                disabled={loading}
                className="flex-1 rounded-xl bg-emerald-600 px-3 py-2"
              >
                <Text className="text-center font-semibold text-white">Approve</Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => void reject(pendingUser.id)}
                disabled={loading}
                className="flex-1 rounded-xl bg-rose-600 px-3 py-2"
              >
                <Text className="text-center font-semibold text-white">Reject</Text>
              </AnimatedPressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
