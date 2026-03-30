import { ProfileScreen } from "@/modules/auth/screens/ProfileScreen";
import { ModuleErrorBoundary } from "@/shared/components/ModuleErrorBoundary";

export default function ProfileRoute() {
  return (
    <ModuleErrorBoundary moduleName="Profile">
      <ProfileScreen />
    </ModuleErrorBoundary>
  );
}
