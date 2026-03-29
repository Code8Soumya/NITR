import { ModuleErrorBoundary } from "@/shared/components/ModuleErrorBoundary";
import { PostDetailScreen } from "@/modules/hype/screens/PostDetailScreen";

export default function PostDetailRoute() {
  return (
    <ModuleErrorBoundary moduleName="Hype Feed">
      <PostDetailScreen />
    </ModuleErrorBoundary>
  );
}
