import type { Meta, StoryObj } from "@storybook/react-vite";

import { useRunnerStore } from "@/flow/store/runnerStore";
import { ScenarioChipsProvider } from "@/scenario/components/chips";
import {
  RunHandlersProvider,
  RunnerBranchBlock,
  RunnerStepChip,
} from "@/scenario/components/RunnerChips";
import { ScenarioDocument } from "@/scenario/components/ScenarioDocument";
import { useScenarioDocument } from "@/scenario/editor/useScenarioDocument";
import { toRunnerFlow } from "@/scenario/runner";

import { executedSampleSteps, sampleDoc, sampleGameFlags } from "./fixtures";

const seed = (cursorId: string | null, skippedStepIds: string[], runningStepId: string | null) => {
  useRunnerStore.setState({
    flowData: toRunnerFlow(executedSampleSteps),
    gameFlags: sampleGameFlags,
    cursorId,
    selectedStepId: null,
    skippedStepIds,
    runningStepId,
    initialized: true,
  });
};

const CHIPS = { Step: RunnerStepChip, Branch: RunnerBranchBlock };
const NOOP_HANDLERS = { onRun: () => {}, onSkip: () => {} };

interface PreviewProps {
  cursorId: string | null;
  skippedStepIds: string[];
  runningStepId: string | null;
}

const RunnerPreview = ({ cursorId, skippedStepIds, runningStepId }: PreviewProps) => {
  seed(cursorId, skippedStepIds, runningStepId);
  const editor = useScenarioDocument({ doc: sampleDoc, editable: false, recordKey: 1 });

  return (
    <div className="w-[720px] bg-base-100">
      <RunHandlersProvider value={NOOP_HANDLERS}>
        <ScenarioChipsProvider value={CHIPS}>
          <ScenarioDocument editor={editor} />
        </ScenarioChipsProvider>
      </RunHandlersProvider>
    </div>
  );
};

const meta = {
  title: "Scenario/RunnerDocument",
  component: RunnerPreview,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RunnerPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { cursorId: "ct", skippedStepIds: ["sm"], runningStepId: null },
};

export const Running: Story = {
  args: { cursorId: "ct", skippedStepIds: ["sm"], runningStepId: "ct" },
};
