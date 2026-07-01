import type { Meta, StoryObj } from "@storybook/react-vite";

import { RunnerStepListPanel } from "@/flow/runner/RunnerStepListPanel";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { noopHandlers, runnerFlow, runnerGameFlags } from "./runnerFixtures";

// runner のステップリスト: 実行済み (✓) / スキップ (⏭) / cursor (▶) のバッジ、分岐の確定枝展開、
// 折りたたみセクションを一度に撮る。VRT 各 story は個別 iframe なので store を都度 seed する。
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

// cc をスキップ、sf を cursor 位置に。cr は実行済み、br は選択枝 (処刑する) が確定。
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

// 実行中: runningStepId をセットしてボタンが無効化された状態。
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
