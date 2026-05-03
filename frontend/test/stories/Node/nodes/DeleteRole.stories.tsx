import type { Meta, StoryObj } from "@storybook/react-vite";

import { DeleteRoleNode } from "@/components/Node/nodes/DeleteRoleNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/DeleteRole",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "DeleteRole",
      Component: DeleteRoleNode,
      data: {
        title: "ロールを削除する",
        deleteAll: false,
        roleNames: ["GM", "プレイヤー"],
      },
    }),
};
