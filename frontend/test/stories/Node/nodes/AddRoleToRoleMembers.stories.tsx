import type { Meta, StoryObj } from "@storybook/react-vite";

import { AddRoleToRoleMembersNode } from "@/components/Node/nodes/AddRoleToRoleMembersNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/AddRoleToRoleMembers",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "AddRoleToRoleMembers",
      Component: AddRoleToRoleMembersNode,
      data: {
        title: "ロールメンバーにロールを付与",
        memberRoleName: "プレイヤー",
        addRoleName: "生存",
      },
    }),
};
