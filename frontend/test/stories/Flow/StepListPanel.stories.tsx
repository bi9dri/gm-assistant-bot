import type { Meta, StoryObj } from "@storybook/react-vite";

import { StepListPanel } from "@/flow/components/StepListPanel";
import { useEditorStore } from "@/flow/store/editorStore";

import { sampleFlow } from "./fixtures";

// zustand は外部ストアなので、render 内で setState すれば同一レンダーで反映される。
// VRT は各 story を個別 iframe で読むため、story ごとに必要な state を seed すればよい。
const seed = (selectedStepId: string | null) => {
  useEditorStore.setState({
    flowData: sampleFlow,
    gameFlags: {},
    selectedStepId,
    initialized: true,
  });
};

const meta = {
  title: "Flow/StepListPanel",
  component: StepListPanel,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StepListPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// 操作 / 分岐 / ツールの各カテゴリ行、分岐ネスト、折りたたみセクションを一度に表示。
export const Default: Story = {
  render: () => {
    seed(null);
    return (
      <div className="w-[420px] bg-base-100 p-2">
        <StepListPanel />
      </div>
    );
  },
};

// 分岐ステップを選択した状態 (選択ハイライト + ネストした枝の表示)。
export const BranchSelected: Story = {
  render: () => {
    seed("br");
    return (
      <div className="w-[420px] bg-base-100 p-2">
        <StepListPanel />
      </div>
    );
  },
};
