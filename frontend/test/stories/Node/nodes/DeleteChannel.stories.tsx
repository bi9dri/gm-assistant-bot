import type { Meta, StoryObj } from "@storybook/react-vite";

import { DeleteChannelNode } from "@/components/Node/nodes/DeleteChannelNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/DeleteChannel",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "DeleteChannel",
      Component: DeleteChannelNode,
      data: {
        title: "チャンネルを削除する",
        channelNames: ["general", "voice"],
      },
    }),
};
