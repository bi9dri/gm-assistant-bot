import type { Meta, StoryObj } from "@storybook/react-vite";

import { CreateRoleNode } from "@/components/Node/nodes/CreateRoleNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/CreateRole",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "CreateRole",
      Component: CreateRoleNode,
      data: {
        title: "ロールを作成する",
        roles: ["GM", "プレイヤー", "観戦"],
      },
    }),
};
