import type { Meta, StoryObj } from "@storybook/react-vite";

import { RunnerFlagPanel } from "@/flow/runner/RunnerFlagPanel";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { runnerFlow, runnerGameFlags } from "./runnerFixtures";

// D3: execute モードのフラグパネル。ライブな GameSession.gameFlags を編集する。
const seed = (gameFlags: Record<string, string>) => {
  useRunnerStore.setState({
    flowData: runnerFlow,
    gameFlags,
    cursorId: null,
    selectedStepId: null,
    skippedStepIds: [],
    runningStepId: null,
    initialized: true,
  });
};

const meta = {
  title: "Flow/RunnerFlagPanel",
  component: RunnerFlagPanel,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RunnerFlagPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFlags: Story = {
  render: () => {
    seed(runnerGameFlags);
    return (
      <div className="w-[280px] bg-base-100">
        <RunnerFlagPanel />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    seed({});
    return (
      <div className="w-[280px] bg-base-100">
        <RunnerFlagPanel />
      </div>
    );
  },
};
