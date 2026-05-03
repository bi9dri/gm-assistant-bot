import type { Meta, StoryObj } from "@storybook/react-vite";

import { SendMessageNode } from "@/components/Node/nodes/SendMessageNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/SendMessage",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleMessage: Story = {
  render: () =>
    renderSingleNode({
      type: "SendMessage",
      Component: SendMessageNode,
      data: {
        title: "メッセージを送信する",
        channelTargets: [{ type: "channelName", value: "general" }],
        messages: [{ content: "事件発生のお知らせ", attachments: [] }],
      },
    }),
};

export const MultipleMessages: Story = {
  render: () =>
    renderSingleNode({
      type: "SendMessage",
      Component: SendMessageNode,
      data: {
        title: "メッセージを送信する",
        channelTargets: [
          { type: "channelName", value: "general" },
          { type: "flagKey", value: "currentScene" },
        ],
        messages: [
          { content: "1 通目: シーン開始", attachments: [] },
          { content: "2 通目: 詳細情報を共有します", attachments: [] },
          { content: "3 通目: 各自行動を開始してください", attachments: [] },
        ],
      },
    }),
};
