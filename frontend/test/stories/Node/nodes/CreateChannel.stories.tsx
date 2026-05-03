import type { Meta, StoryObj } from "@storybook/react-vite";

import { CreateChannelNode } from "@/components/Node/nodes/CreateChannelNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/CreateChannel",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "CreateChannel",
      Component: CreateChannelNode,
      data: {
        title: "チャンネルを作成する",
        channels: [
          {
            name: "general",
            type: "text",
            rolePermissions: [
              { roleName: "GM", canWrite: true },
              { roleName: "プレイヤー", canWrite: true },
            ],
          },
          {
            name: "voice",
            type: "voice",
            rolePermissions: [{ roleName: "プレイヤー", canWrite: true }],
          },
        ],
      },
    }),
};
