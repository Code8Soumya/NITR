import { useMemo } from "react";

import { useAuthStore } from "@/modules/auth/store/authStore";

export const useAuth = () => {
  const bootstrapped = useAuthStore((state) => state.bootstrapped);
  const busy = useAuthStore((state) => state.busy);
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const error = useAuthStore((state) => state.error);

  const initialize = useAuthStore((state) => state.initialize);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);

  const derived = useMemo(() => {
    const isAuthenticated = Boolean(user && tokens?.accessToken);
    const isApproved = Boolean(user && (user.isAdmin || user.approvalStatus === "approved"));
    const isPending = Boolean(user && !user.isAdmin && user.approvalStatus === "pending");

    return {
      isAuthenticated,
      isApproved,
      isPending,
      isAdmin: Boolean(user?.isAdmin)
    };
  }, [tokens?.accessToken, user]);

  return {
    bootstrapped,
    busy,
    user,
    tokens,
    error,
    initialize,
    login,
    register,
    updateProfile,
    refreshProfile,
    logout,
    clearError,
    ...derived
  };
};
