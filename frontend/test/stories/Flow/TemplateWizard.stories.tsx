import type { Meta, StoryObj } from "@storybook/react-vite";

import { TemplateWizard } from "@/flow/wizard/TemplateWizard";

// 新規テンプレートウィザード (Phase 4)。入力フォームと生成ステップのプレビューを
// VRT で押さえる。onCreate は VRT では発火しないので no-op。
const meta = {
  title: "Flow/TemplateWizard",
  component: TemplateWizard,
  args: { onCreate: () => {} },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TemplateWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = (node: React.ReactNode) => (
  <div className="flex h-[640px] w-[880px] flex-col bg-base-100">{node}</div>
);

// 初期状態: 入力は空。プレビューは常に生成される準備・片付けの最小構成。
export const Empty: Story = {
  render: () => frame(<TemplateWizard onCreate={() => {}} />),
};

// キャラ名・VC・カテゴリ・共通チャンネルを入れた状態のプレビュー (連鎖バッジ含む)。
export const Populated: Story = {
  render: () =>
    frame(
      <TemplateWizard
        onCreate={() => {}}
        initialParams={{
          characterNames: ["探偵", "犯人", "被害者"],
          voiceChannelCount: 2,
          categoryName: "事件",
          sharedTextChannels: ["全体", "投票"],
        }}
      />,
    ),
};
