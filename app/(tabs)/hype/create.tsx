import { ModuleErrorBoundary } from "@/shared/components/ModuleErrorBoundary";
import { CreatePostScreen } from "@/modules/hype/screens/CreatePostScreen";

export default function CreateHypeRoute() {
  return (
    <ModuleErrorBoundary moduleName="Hype Feed">
      <CreatePostScreen />
    </ModuleErrorBoundary>
  );
}
