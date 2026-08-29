import type { Meta, StoryObj } from "@storybook/react-vite";

import { CopyButton } from "@/scenario/components/CopyButton";

// 本文ブロックと SendMessage の行に出るコピーボタン (docs: scenario-editor-architecture D13)。
// ドキュメント全体のストーリーでは 1 行分の差でしかなく VRT の閾値に埋もれるため、
// ボタン単体でも撮る。
const meta = {
  title: "Scenario/CopyButton",
  component: CopyButton,
  args: { text: "館に着いた頃には日が暮れていた。" },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
