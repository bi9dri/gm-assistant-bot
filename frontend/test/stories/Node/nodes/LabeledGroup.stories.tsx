import type { Meta, StoryObj } from "@storybook/react-vite";

import { LabeledGroupNode } from "@/components/Node/nodes/LabeledGroupNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/LabeledGroup",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "LabeledGroup",
      Component: LabeledGroupNode,
      data: { label: "導入フェーズ" },
      width: 480,
      height: 280,
    }),
};

export const Colored: Story = {
  render: () =>
    renderSingleNode({
      type: "LabeledGroup",
      Component: LabeledGroupNode,
      data: { label: "事件発生", bgColor: "bg-red-500/20" },
      width: 480,
      height: 280,
    }),
};
