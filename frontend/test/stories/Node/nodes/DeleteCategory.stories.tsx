import type { Meta, StoryObj } from "@storybook/react-vite";

import { DeleteCategoryNode } from "@/components/Node/nodes/DeleteCategoryNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/DeleteCategory",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "DeleteCategory",
      Component: DeleteCategoryNode,
      data: { title: "カテゴリを削除する" },
    }),
};
