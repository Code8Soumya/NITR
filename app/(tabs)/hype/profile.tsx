import { ProfileViewScreen } from "@/modules/auth/screens/ProfileViewScreen";
import { ModuleErrorBoundary } from "@/shared/components/ModuleErrorBoundary";

export default function ProfileRoute() {
  return (
    <ModuleErrorBoundary moduleName="Profile">
      <ProfileViewScreen />
    </ModuleErrorBoundary>
  );
}
