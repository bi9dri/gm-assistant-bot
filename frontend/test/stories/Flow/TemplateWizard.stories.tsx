import type { Meta, StoryObj } from "@storybook/react-vite";

import { TemplateWizard } from "@/flow/wizard/TemplateWizard";

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

export const Empty: Story = {
  render: () => frame(<TemplateWizard onCreate={() => {}} />),
};

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
