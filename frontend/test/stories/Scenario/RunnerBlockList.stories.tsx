import type { Meta, StoryObj } from "@storybook/react-vite";

import { useRunnerStore } from "@/flow/store/runnerStore";
import { RunnerBlockList } from "@/scenario/components/RunnerBlockList";
import { restartFromHeading, toRunnerFlow } from "@/scenario/runner";

import { executedSampleBlocks, sampleLiveFlags } from "./fixtures";

// 実行モードのドキュメント: 実行済み (✓) / スキップ (⏭) / カーソル (▶) のマーカー、
// Branch の確定枝の展開、見出しの「ここから再実行」を撮る。
// VRT 各 story は個別 iframe なので store を都度 seed する。
const seed = (cursorId: string | null, skippedStepIds: string[]) => {
  useRunnerStore.setState({
    flowData: toRunnerFlow(executedSampleBlocks),
    gameFlags: sampleLiveFlags,
    cursorId,
    selectedStepId: null,
    skippedStepIds,
    runningStepId: null,
    initialized: true,
  });
};

const noopHandlers = { onRun: () => {}, onSkip: () => {} };

const meta = {
  title: "Scenario/RunnerBlockList",
  component: RunnerBlockList,
  parameters: { layout: "fullscreen" },
  args: { handlers: noopHandlers },
} satisfies Meta<typeof RunnerBlockList>;

export default meta;
type Story = StoryObj<typeof meta>;

// 導入は通過済み、開始メッセージはスキップ、カーソルは確定枝の中の本文。
export const Default: Story = {
  render: () => {
    seed("t2", ["sm"]);
    return (
      <div className="w-[720px] bg-base-100">
        <RunnerBlockList handlers={noopHandlers} />
      </div>
    );
  },
};

// 実行中: runningStepId をセットして実行系ボタンが無効化された状態。
export const Running: Story = {
  render: () => {
    seed("t2", ["sm"]);
    useRunnerStore.setState({ runningStepId: "t2" });
    return (
      <div className="w-[720px] bg-base-100">
        <RunnerBlockList handlers={noopHandlers} />
      </div>
    );
  },
};

// ループ後 (docs: scenario-editor-architecture D9): 見出し「導入」から再実行すると
// 配下の実行済み・スキップの記録が消え、カーソルが見出しへ戻る。
export const AfterRestart: Story = {
  render: () => {
    seed("t2", ["sm"]);
    restartFromHeading("h1");
    return (
      <div className="w-[720px] bg-base-100">
        <RunnerBlockList handlers={noopHandlers} />
      </div>
    );
  },
};
