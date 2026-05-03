import type { Meta, StoryObj } from "@storybook/react-vite";

import { SetGameFlagNode } from "@/components/Node/nodes/SetGameFlagNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/SetGameFlag",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "SetGameFlag",
      Component: SetGameFlagNode,
      data: {
        title: "ゲームフラグを設定する",
        flagKey: "currentScene",
        flagValue: "morning",
      },
    }),
};
