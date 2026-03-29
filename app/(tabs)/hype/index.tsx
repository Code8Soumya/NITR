import { ModuleErrorBoundary } from "@/shared/components/ModuleErrorBoundary";
import { HypeFeedScreen } from "@/modules/hype/screens/HypeFeedScreen";

export default function HypeRoute() {
  return (
    <ModuleErrorBoundary moduleName="Hype Feed">
      <HypeFeedScreen />
    </ModuleErrorBoundary>
  );
}
