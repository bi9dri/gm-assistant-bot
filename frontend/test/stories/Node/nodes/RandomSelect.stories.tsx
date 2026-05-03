import type { Meta, StoryObj } from "@storybook/react-vite";

import { RandomSelectNode } from "@/components/Node/nodes/RandomSelectNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/RandomSelect",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "RandomSelect",
      Component: RandomSelectNode,
      data: {
        title: "ランダム選択",
        items: ["選択肢A", "選択肢B", "選択肢C"],
        resultFlagKey: "selectedItem",
      },
    }),
};
