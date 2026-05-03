import type { Meta, StoryObj } from "@storybook/react-vite";

import { CreateCategoryNode } from "@/components/Node/nodes/CreateCategoryNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/CreateCategory",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "CreateCategory",
      Component: CreateCategoryNode,
      data: {
        title: "カテゴリを作成する",
        categoryName: { type: "literal", value: "本編" },
      },
    }),
};
