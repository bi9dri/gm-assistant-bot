import type { Meta, StoryObj } from "@storybook/react-vite";

import { RunnerDetailPanel } from "@/flow/runner/RunnerDetailPanel";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { noopHandlers, runnerFlow, runnerGameFlags } from "./runnerFixtures";

const seed = (selectedStepId: string) => {
  useRunnerStore.setState({
    flowData: runnerFlow,
    gameFlags: runnerGameFlags,
    cursorId: "sf",
    selectedStepId,
    skippedStepIds: [],
    runningStepId: null,
    initialized: true,
  });
};

const meta = {
  title: "Flow/RunnerDetailPanel",
  component: RunnerDetailPanel,
  parameters: { layout: "fullscreen" },
  args: { handlers: noopHandlers },
} satisfies Meta<typeof RunnerDetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (selectedStepId: string): Story => ({
  render: () => {
    seed(selectedStepId);
    return (
      <div className="w-[480px] bg-base-100">
        <RunnerDetailPanel handlers={noopHandlers} />
      </div>
    );
  },
});

export const UnexecutedAction = story("sf");
export const ExecutedAction = story("cr");
export const ExecutedBranch = story("br");
export const ToolCounter = story("ct");

export const SelectBranchChoosing: Story = {
  render: () => {
    const flow = structuredClone(runnerFlow);
    const branch = flow.sections[1]?.steps.find((step) => step.id === "br");
    if (branch !== undefined) {
      delete branch.executedAt;
      if (branch.type === "Branch") delete branch.executedBranchIds;
    }
    useRunnerStore.setState({
      flowData: flow,
      gameFlags: runnerGameFlags,
      cursorId: "br",
      selectedStepId: "br",
      skippedStepIds: [],
      runningStepId: null,
      initialized: true,
    });
    return (
      <div className="w-[480px] bg-base-100">
        <RunnerDetailPanel handlers={noopHandlers} />
      </div>
    );
  },
};
