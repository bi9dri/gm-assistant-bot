import type { Meta, StoryObj } from "@storybook/react-vite";

import { CounterNode } from "@/components/Node/nodes/CounterNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/Counter",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "Counter",
      Component: CounterNode,
      data: {
        title: "カウンター",
        flagKey: "score",
        step: 1,
      },
    }),
};
