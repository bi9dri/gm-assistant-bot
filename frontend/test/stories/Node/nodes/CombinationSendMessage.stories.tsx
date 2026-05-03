import type { Meta, StoryObj } from "@storybook/react-vite";

import { CombinationSendMessageNode } from "@/components/Node/nodes/CombinationSendMessageNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/CombinationSendMessage",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "CombinationSendMessage",
      Component: CombinationSendMessageNode,
      data: {
        title: "組み合わせメッセージを送信する",
        entries: [
          {
            id: "entry-1",
            channelName: "scene-1",
            messages: [{ content: "シーン1: 朝の会話", attachments: [] }],
            collapsed: false,
          },
          {
            id: "entry-2",
            channelName: "scene-2",
            messages: [{ content: "シーン2: 昼の調査", attachments: [] }],
            collapsed: true,
          },
        ],
      },
    }),
};
