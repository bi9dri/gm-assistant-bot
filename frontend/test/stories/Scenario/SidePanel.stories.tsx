import type { Meta, StoryObj } from "@storybook/react-vite";

import { SidePanel } from "@/scenario/components/ScenarioEditor";
import { useScenarioEditorStore } from "@/scenario/store/editorStore";

import { sampleDoc, sampleGameFlags, sampleSteps } from "./fixtures";

const seed = () => {
  useScenarioEditorStore.setState({
    doc: sampleDoc,
    steps: sampleSteps,
    gameFlags: sampleGameFlags,
    selectedStepId: null,
    initialized: true,
  });
};

const meta = {
  title: "Scenario/SidePanel",
  component: SidePanel,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// 文中の操作を選択すると、既存 registry の DetailPanel がここに開く (docs: scenario-editor-architecture D7)。
export const StepSelected: Story = {
  args: { steps: sampleSteps, selectedId: "sm" },
  render: (args) => {
    seed();
    return (
      <div className="w-[420px] bg-base-100">
        <SidePanel {...args} />
      </div>
    );
  },
};

export const NoSelection: Story = {
  args: { steps: sampleSteps, selectedId: null },
  render: (args) => {
    seed();
    return (
      <div className="w-[420px] bg-base-100">
        <SidePanel {...args} />
      </div>
    );
  },
};
