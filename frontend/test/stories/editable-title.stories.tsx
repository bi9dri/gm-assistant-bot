import type { Meta, StoryObj } from "@storybook/react-vite";

import { EditableTitle } from "@/components/Node/base/editable-title";

const meta = {
  title: "Node/Base/EditableTitle",
  component: EditableTitle,
  args: { onTitleChange: () => {} },
} satisfies Meta<typeof EditableTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: "Sample Node", defaultTitle: "Untitled" },
};

export const Empty: Story = {
  args: { title: "", defaultTitle: "Untitled" },
};

export const LongTitle: Story = {
  args: {
    title: "とても長いタイトルで truncate を確認するためのサンプル",
    defaultTitle: "Untitled",
  },
};
