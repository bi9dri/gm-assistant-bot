import type { Meta, StoryObj } from "@storybook/react-vite";

import { SelectBranchNode } from "@/components/Node/nodes/SelectBranchNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/SelectBranch",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "SelectBranch",
      Component: SelectBranchNode,
      data: {
        title: "選択肢を選ぶ",
        options: [
          { id: "opt-1", label: "犯人を捕まえる" },
          { id: "opt-2", label: "黙って見過ごす" },
          { id: "opt-3", label: "GMに相談する" },
        ],
        flagName: "playerChoice",
      },
    }),
};
