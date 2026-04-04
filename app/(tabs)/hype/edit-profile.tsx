import { ProfileScreen } from "@/modules/auth/screens/ProfileScreen";
import { ModuleErrorBoundary } from "@/shared/components/ModuleErrorBoundary";

export default function EditProfileRoute() {
  return (
    <ModuleErrorBoundary moduleName="Edit Profile">
      <ProfileScreen />
    </ModuleErrorBoundary>
  );
}
