import type { Meta, StoryObj } from "@storybook/react-vite";

import { KanbanNode } from "@/components/Node/nodes/KanbanNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/Kanban",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () =>
    renderSingleNode({
      type: "Kanban",
      Component: KanbanNode,
      data: {
        title: "カンバン",
        columns: [
          { id: "col-todo", label: "TODO" },
          { id: "col-doing", label: "進行中" },
          { id: "col-done", label: "完了" },
        ],
        cards: [
          { id: "card-1", label: "事件発生" },
          { id: "card-2", label: "聞き込み" },
          { id: "card-3", label: "推理" },
        ],
        initialPlacements: [
          { cardId: "card-1", columnId: "col-done" },
          { cardId: "card-2", columnId: "col-doing" },
          { cardId: "card-3", columnId: "col-todo" },
        ],
        cardPlacements: [],
      },
    }),
};
