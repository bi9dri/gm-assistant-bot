import type { Meta, StoryObj } from "@storybook/react-vite";

import { BlockDocument } from "@/scenario/components/BlockDocument";
import { useScenarioEditorStore } from "@/scenario/store/editorStore";

import { sampleBlocks, sampleGameFlags } from "./fixtures";

// zustand は外部ストアなので、render 内で setState すれば同一レンダーで反映される。
// VRT は各 story を個別 iframe で読むため、story ごとに必要な state を seed すればよい。
const seed = (selectedBlockId: string | null) => {
  useScenarioEditorStore.setState({
    blocks: sampleBlocks,
    gameFlags: sampleGameFlags,
    selectedBlockId,
    initialized: true,
  });
};

const meta = {
  title: "Scenario/BlockDocument",
  component: BlockDocument,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BlockDocument>;

export default meta;
type Story = StoryObj<typeof meta>;

// 見出し階層・インライン編集の本文・操作ブロックのサマリ・Branch ネスト・
// 折りたたみ済みの見出しを一度に表示する。
export const Default: Story = {
  render: () => {
    seed(null);
    return (
      <div className="w-[720px] bg-base-100">
        <BlockDocument />
      </div>
    );
  },
};

// 操作ブロックを選択した状態 (選択ハイライト)。詳細は右カラム (SidePanel) に出る。
export const OperationBlockSelected: Story = {
  render: () => {
    seed("sm");
    return (
      <div className="w-[720px] bg-base-100">
        <BlockDocument />
      </div>
    );
  },
};
