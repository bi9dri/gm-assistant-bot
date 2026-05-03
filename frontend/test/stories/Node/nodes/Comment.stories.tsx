import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommentNode } from "@/components/Node/nodes/CommentNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/Comment",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "Comment",
      Component: CommentNode,
      data: { comment: "シナリオの導入フェーズ" },
      width: 256,
      height: 120,
    }),
};

export const Empty: Story = {
  render: () =>
    renderSingleNode({
      type: "Comment",
      Component: CommentNode,
      data: { comment: "" },
      width: 256,
      height: 120,
    }),
};

export const Long: Story = {
  render: () =>
    renderSingleNode({
      type: "Comment",
      Component: CommentNode,
      data: {
        comment:
          "長いコメントの例: 複数行にまたがるシナリオメモを書く想定で、改行を含むテキストを入れて折り返しと resizer の挙動を確認する。",
      },
      width: 320,
      height: 200,
    }),
};
