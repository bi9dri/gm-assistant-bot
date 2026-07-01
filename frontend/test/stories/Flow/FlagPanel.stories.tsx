import type { Meta, StoryObj } from "@storybook/react-vite";

import { FlagPanel } from "@/flow/components/FlagPanel";
import { defaultFlowData } from "@/flow/schema";
import { useEditorStore } from "@/flow/store/editorStore";

import { sampleGameFlags } from "./fixtures";

const seed = (gameFlags: Record<string, unknown>) => {
  useEditorStore.setState({
    flowData: defaultFlowData,
    gameFlags,
    selectedStepId: null,
    initialized: true,
  });
};

const meta = {
  title: "Flow/FlagPanel",
  component: FlagPanel,
} satisfies Meta<typeof FlagPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFlags: Story = {
  render: () => {
    seed(sampleGameFlags);
    return (
      <div className="w-72 bg-base-100">
        <FlagPanel />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    seed({});
    return (
      <div className="w-72 bg-base-100">
        <FlagPanel />
      </div>
    );
  },
};
