import type { Meta, StoryObj } from "@storybook/react-vite";

import { RunnerDetailPanel } from "@/flow/runner/RunnerDetailPanel";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { noopHandlers, runnerFlow, runnerGameFlags } from "./runnerFixtures";

// 中央詳細パネルの各実行状態を撮る。selectedStepId を変えて 1 story = 1 状態にする。
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

// 未実行の action: [実行]/[スキップ] + 編集可能な詳細。
export const UnexecutedAction = story("sf");
// 実行済み action: [再実行] のみ、詳細は read-only (実行済みバッジ)。
export const ExecutedAction = story("cr");
// 実行済みの select 分岐 (枝確定済み)。
export const ExecutedBranch = story("br");
// tool: 操作 UI (Counter の +1 ボタンと現在値)。
export const ToolCounter = story("ct");

// 未実行の select 分岐: 枝ボタンで実行を選ぶ UI。br の実行痕跡を消して撮る。
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
