import { Redirect } from "expo-router";

import { PendingApprovalScreen } from "@/modules/auth/screens/PendingApprovalScreen";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export default function PendingRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href={"/(auth)/login" as never} />;
  }

  if (user.isAdmin || user.approvalStatus === "approved") {
    return <Redirect href={"/" as never} />;
  }

  return <PendingApprovalScreen />;
}
