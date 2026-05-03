import type { Meta, StoryObj } from "@storybook/react-vite";

import { ChangeChannelPermissionNode } from "@/components/Node/nodes/ChangeChannelPermissionNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/ChangeChannelPermission",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "ChangeChannelPermission",
      Component: ChangeChannelPermissionNode,
      data: {
        title: "チャンネル権限を変更する",
        channelName: "general",
        rolePermissions: [
          { roleName: "GM", canWrite: true },
          { roleName: "プレイヤー", canWrite: false },
        ],
      },
    }),
};
