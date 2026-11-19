import type { Meta, StoryObj } from "@storybook/react-vite";

import { RunnerStepListPanel } from "@/flow/runner/RunnerStepListPanel";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { noopHandlers, runnerFlow, runnerGameFlags } from "./runnerFixtures";

const seed = (skippedStepIds: string[], cursorId: string | null, selectedStepId: string | null) => {
  useRunnerStore.setState({
    flowData: runnerFlow,
    gameFlags: runnerGameFlags,
    cursorId,
    selectedStepId,
    skippedStepIds,
    runningStepId: null,
    initialized: true,
  });
};

const meta = {
  title: "Flow/RunnerStepList",
  component: RunnerStepListPanel,
  parameters: { layout: "fullscreen" },
  args: { handlers: noopHandlers },
} satisfies Meta<typeof RunnerStepListPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    seed(["cc"], "sf", null);
    return (
      <div className="w-[420px] bg-base-100 p-2">
        <RunnerStepListPanel handlers={noopHandlers} />
      </div>
    );
  },
};

export const Running: Story = {
  render: () => {
    seed([], "sf", "sf");
    useRunnerStore.setState({ runningStepId: "sf" });
    return (
      <div className="w-[420px] bg-base-100 p-2">
        <RunnerStepListPanel handlers={noopHandlers} />
      </div>
    );
  },
};
