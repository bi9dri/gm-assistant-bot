import type { Meta, StoryObj } from "@storybook/react-vite";

import { TableOfContents } from "@/scenario/components/TableOfContents";

import { sampleBlocks } from "./fixtures";

const meta = {
  title: "Scenario/TableOfContents",
  component: TableOfContents,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TableOfContents>;

export default meta;
type Story = StoryObj<typeof meta>;

// H1 > H2 の階層と、折りたたみ済みの見出しも目次には出ること。
export const Default: Story = {
  args: { blocks: sampleBlocks },
  render: (args) => (
    <div className="w-[280px] bg-base-100">
      <TableOfContents {...args} />
    </div>
  ),
};

export const NoHeading: Story = {
  args: { blocks: [] },
  render: (args) => (
    <div className="w-[280px] bg-base-100">
      <TableOfContents {...args} />
    </div>
  ),
};
