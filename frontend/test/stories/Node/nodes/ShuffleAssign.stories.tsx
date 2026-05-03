import type { Meta, StoryObj } from "@storybook/react-vite";

import { ShuffleAssignNode } from "@/components/Node/nodes/ShuffleAssignNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/ShuffleAssign",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "ShuffleAssign",
      Component: ShuffleAssignNode,
      data: {
        title: "ロール抽選",
        items: ["探偵", "助手", "容疑者"],
        targets: ["プレイヤー1", "プレイヤー2", "プレイヤー3"],
        resultFlagPrefix: "assigned_",
      },
    }),
};
