import type { Meta, StoryObj } from "@storybook/react-vite";

import { RecordCombinationNode } from "@/components/Node/nodes/RecordCombinationNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/RecordCombination",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "RecordCombination",
      Component: RecordCombinationNode,
      data: {
        title: "組み合わせを記録",
        config: {
          mode: "different-set",
          allowSelfPairing: false,
          allowDuplicates: false,
          distinguishOrder: true,
          allowMultipleAssignments: false,
        },
        sourceOptions: {
          label: "プレイヤー",
          items: [
            { id: "src-1", label: "アリス" },
            { id: "src-2", label: "ボブ" },
            { id: "src-3", label: "キャロル" },
          ],
        },
        targetOptions: {
          label: "キャラクター",
          items: [
            { id: "tgt-1", label: "探偵" },
            { id: "tgt-2", label: "助手" },
            { id: "tgt-3", label: "容疑者" },
          ],
        },
        recordedPairs: [],
      },
    }),
};
