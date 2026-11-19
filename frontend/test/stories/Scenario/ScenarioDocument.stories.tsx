import type { Meta, StoryObj } from "@storybook/react-vite";

import { ScenarioChipsProvider } from "@/scenario/components/chips";
import { EditorBranchBlock, EditorStepChip } from "@/scenario/components/EditorChips";
import { ScenarioDocument } from "@/scenario/components/ScenarioDocument";
import { Toolbar } from "@/scenario/components/Toolbar";
import { useScenarioDocument } from "@/scenario/editor/useScenarioDocument";
import { useScenarioEditorStore } from "@/scenario/store/editorStore";

import { sampleDoc, sampleGameFlags, sampleSteps } from "./fixtures";

const seed = (selectedStepId: string | null) => {
  useScenarioEditorStore.setState({
    doc: sampleDoc,
    steps: sampleSteps,
    gameFlags: sampleGameFlags,
    selectedStepId,
    initialized: true,
  });
};

const CHIPS = { Step: EditorStepChip, Branch: EditorBranchBlock };

const EditorPreview = ({ selectedStepId }: { selectedStepId: string | null }) => {
  seed(selectedStepId);
  const createStep = useScenarioEditorStore((state) => state.createStep);
  const setDoc = useScenarioEditorStore((state) => state.setDoc);
  const editor = useScenarioDocument({
    doc: sampleDoc,
    editable: true,
    recordKey: 1,
    onChange: setDoc,
  });

  return (
    <div className="w-[720px] bg-base-100">
      <Toolbar editor={editor} onInsertStep={createStep} />
      <ScenarioChipsProvider value={CHIPS}>
        <ScenarioDocument editor={editor} />
      </ScenarioChipsProvider>
    </div>
  );
};

const meta = {
  title: "Scenario/ScenarioDocument",
  component: EditorPreview,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EditorPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { selectedStepId: null } };

export const StepSelected: Story = { args: { selectedStepId: "sm" } };
