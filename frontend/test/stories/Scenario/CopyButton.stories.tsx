import type { Meta, StoryObj } from "@storybook/react-vite";

import { CopyButton } from "@/scenario/components/CopyButton";

const meta = {
  title: "Scenario/CopyButton",
  component: CopyButton,
  args: { text: "館に着いた頃には日が暮れていた。" },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
