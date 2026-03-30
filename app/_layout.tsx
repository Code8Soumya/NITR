import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthStore } from "@/modules/auth/store/authStore";
import { appLogger } from "@/shared/utils/logger";

type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void;
type GlobalErrorUtils = {
  getGlobalHandler?: () => GlobalErrorHandler;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize().catch((error: unknown) => {
      appLogger.error(
        "Failed to initialize auth session",
        {
          file: "app/_layout.tsx",
          location: "RootLayout.useEffect(initialize)",
          action: "boot app auth state"
        },
        error
      );
    });
  }, [initialize]);

  useEffect(() => {
    const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;

    if (!errorUtils?.getGlobalHandler || !errorUtils.setGlobalHandler) {
      appLogger.warn("Global ErrorUtils handler is unavailable", {
        file: "app/_layout.tsx",
        location: "RootLayout.useEffect(globalErrorHandler)",
        action: "install uncaught runtime error logger"
      });
      return;
    }

    const previousHandler = errorUtils.getGlobalHandler();
    const nextHandler: GlobalErrorHandler = (error, isFatal) => {
      appLogger.error(
        "Unhandled JavaScript runtime error",
        {
          file: "app/_layout.tsx",
          location: "RootLayout.globalErrorHandler",
          action: "capture uncaught JS errors",
          details: {
            isFatal: Boolean(isFatal)
          }
        },
        error
      );

      previousHandler(error, isFatal);
    };

    errorUtils.setGlobalHandler(nextHandler);

    return () => {
      errorUtils.setGlobalHandler?.(previousHandler);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
