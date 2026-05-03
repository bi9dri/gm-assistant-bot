import type { Meta, StoryObj } from "@storybook/react-vite";

import { ConditionalBranchNode } from "@/components/Node/nodes/ConditionalBranchNode";

import { renderSingleNode } from "./_render";

const meta = {
  title: "Node/Nodes/ConditionalBranch",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleRule: Story = {
  render: () =>
    renderSingleNode({
      type: "ConditionalBranch",
      Component: ConditionalBranchNode,
      data: {
        title: "条件分岐",
        conditions: [
          {
            id: "branch-1",
            root: {
              type: "rule",
              id: "rule-1",
              flagKey: "team",
              operator: "equals",
              value: "red",
              valueType: "literal",
            },
          },
        ],
        hasDefaultBranch: true,
        matchMode: "first",
      },
    }),
};

export const NestedGroup: Story = {
  render: () =>
    renderSingleNode({
      type: "ConditionalBranch",
      Component: ConditionalBranchNode,
      data: {
        title: "複合条件",
        conditions: [
          {
            id: "branch-1",
            root: {
              type: "group",
              id: "group-1",
              logic: "and",
              children: [
                {
                  type: "rule",
                  id: "rule-1",
                  flagKey: "team",
                  operator: "equals",
                  value: "red",
                  valueType: "literal",
                },
                {
                  type: "group",
                  id: "group-2",
                  logic: "or",
                  children: [
                    {
                      type: "rule",
                      id: "rule-2",
                      flagKey: "score",
                      operator: "equals",
                      value: "10",
                      valueType: "literal",
                    },
                    {
                      type: "rule",
                      id: "rule-3",
                      flagKey: "bonus",
                      operator: "exists",
                      value: "",
                      valueType: "literal",
                    },
                  ],
                },
              ],
            },
          },
        ],
        hasDefaultBranch: true,
        matchMode: "first",
      },
    }),
};
