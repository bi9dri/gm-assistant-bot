import type { Meta, StoryObj } from "@storybook/react-vite";

import { TableOfContents } from "@/scenario/components/TableOfContents";

import { sampleDoc } from "./fixtures";

const meta = {
  title: "Scenario/TableOfContents",
  component: TableOfContents,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TableOfContents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { doc: sampleDoc },
  render: (args) => (
    <div className="w-[280px] bg-base-100">
      <TableOfContents {...args} />
    </div>
  ),
};

export const NoHeading: Story = {
  args: { doc: { type: "doc", content: [{ type: "paragraph" }] } },
  render: (args) => (
    <div className="w-[280px] bg-base-100">
      <TableOfContents {...args} />
    </div>
  ),
};

export const WithRestart: Story = {
  args: { doc: sampleDoc, onRestart: () => {} },
  render: (args) => (
    <div className="w-[280px] bg-base-100">
      <TableOfContents {...args} />
    </div>
  ),
};
