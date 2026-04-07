import React, { type PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";

import { appLogger } from "@/shared/utils/logger";

type ModuleErrorBoundaryProps = PropsWithChildren<{
  moduleName: string;
}>;

type ModuleErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

export class ModuleErrorBoundary extends React.Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    appLogger.error(
      "Module error boundary caught render error",
      {
        file: "src/shared/components/ModuleErrorBoundary.tsx",
        location: "ModuleErrorBoundary.componentDidCatch",
        action: "render module boundary",
        details: {
          moduleName: this.props.moduleName,
          componentStack: errorInfo.componentStack
        }
      },
      error
    );
  }

  private resetBoundary = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-[#fff7f2] px-6">
          <View className="w-full max-w-sm rounded-2xl bg-background p-6" style={{ elevation: 3 }}>
            <Text className="text-2xl font-heading text-text font-bold font-heading text-slate-900">{this.props.moduleName}</Text>
            <Text className="mt-2 text-base text-slate-600">
              This module crashed but other tabs remain usable.
            </Text>
            {this.state.message ? (
              <Text className="mt-2 text-sm text-primary">{this.state.message}</Text>
            ) : null}
            <Pressable
              className="mt-5 rounded-xl btn-primary bg-cta px-4 py-3 cursor-pointer"
              android_ripple={{ color: "#be123c" }}
              onPress={this.resetBoundary}
            >
              <Text className="text-center text-base font-semibold text-white">Retry Module</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
