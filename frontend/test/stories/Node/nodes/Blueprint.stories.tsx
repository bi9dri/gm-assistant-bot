import type { Meta, StoryObj } from "@storybook/react-vite";

import { BlueprintNode } from "@/components/Node/nodes/BlueprintNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/Blueprint",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "Blueprint",
      Component: BlueprintNode,
      data: {
        title: "マーダーミステリー基本セット",
        parameters: {
          characterNames: ["探偵", "助手", "容疑者A", "容疑者B"],
          voiceChannelCount: 2,
          categoryName: "本編",
          sharedTextChannels: ["全体連絡", "GMメモ"],
        },
      },
    }),
};
