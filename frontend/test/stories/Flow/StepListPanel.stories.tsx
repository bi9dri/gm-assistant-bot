import type { Meta, StoryObj } from "@storybook/react-vite";

import { StepListPanel } from "@/flow/components/StepListPanel";
import { useEditorStore } from "@/flow/store/editorStore";

import { sampleFlow } from "./fixtures";

const seed = (selectedStepId: string | null) => {
  useEditorStore.setState({
    flowData: sampleFlow,
    gameFlags: {},
    selectedStepId,
    initialized: true,
  });
};

const meta = {
  title: "Flow/StepListPanel",
  component: StepListPanel,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StepListPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    seed(null);
    return (
      <div className="w-[420px] bg-base-100 p-2">
        <StepListPanel />
      </div>
    );
  },
};

export const BranchSelected: Story = {
  render: () => {
    seed("br");
    return (
      <div className="w-[420px] bg-base-100 p-2">
        <StepListPanel />
      </div>
    );
  },
};
