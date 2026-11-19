import { StepTypeMenu } from "@/flow/components/AddStepMenu";
import type { BranchArm, BranchStep } from "@/flow/schema";
import { findStepIn } from "@/flow/treeOps";

import { newStep, useScenarioEditorStore } from "../store/editorStore";
import { stepCopyText } from "../textTransfer";
import type { ChipProps } from "./chips";
import { CopyButton } from "./CopyButton";
import { MissingStepChip, StepChip } from "./StepChip";

export const INSERTABLE_CATEGORIES = ["action", "branch", "tool"] as const;

export const EditorStepChip = ({ stepId }: ChipProps) => {
  const step = useScenarioEditorStore((state) => findStepIn(state.steps, stepId));
  const selected = useScenarioEditorStore((state) => state.selectedStepId === stepId);
  const selectStep = useScenarioEditorStore((state) => state.selectStep);

  if (step === undefined) return <MissingStepChip />;
  const copyText = stepCopyText(step);

  return (
    <StepChip step={step} selected={selected} onSelect={() => selectStep(stepId)}>
      {copyText !== "" && <CopyButton text={copyText} />}
    </StepChip>
  );
};

const ArmEditor = ({ branch, arm }: { branch: BranchStep; arm: BranchArm }) => {
  const updateStep = useScenarioEditorStore((state) => state.updateStep);

  const setArm = (patch: Partial<BranchArm>) => {
    const branches: Partial<BranchStep> = {
      branches: branch.branches.map((current) =>
        current.id === arm.id ? { ...current, ...patch } : current,
      ),
    };
    updateStep(branch.id, branches);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-base-content/60">
        ▸ {arm.label || "(無名の枝)"}
        {branch.mode === "auto" && arm.condition === undefined ? " (デフォルト)" : ""}
      </span>
      <div className="flex flex-wrap items-center gap-1 pl-3">
        {arm.steps.map((step) => (
          <span key={step.id} className="inline-flex items-center">
            <EditorStepChip stepId={step.id} />
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              aria-label="枝からこの操作を外す"
              onClick={() => setArm({ steps: arm.steps.filter((one) => one.id !== step.id) })}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="w-48 pl-3">
        <StepTypeMenu
          label="＋ 枝に操作を追加"
          categories={[...INSERTABLE_CATEGORIES]}
          onPick={(type) => {
            const step = newStep(type);
            if (step !== undefined) setArm({ steps: [...arm.steps, step] });
          }}
        />
      </div>
    </div>
  );
};

export const EditorBranchBlock = ({ stepId }: ChipProps) => {
  const step = useScenarioEditorStore((state) => findStepIn(state.steps, stepId));
  const selected = useScenarioEditorStore((state) => state.selectedStepId === stepId);
  const selectStep = useScenarioEditorStore((state) => state.selectStep);

  if (step === undefined || step.type !== "Branch") return <MissingStepChip />;

  return (
    <div contentEditable={false} className="rounded border border-base-300 bg-base-200/50 p-2">
      <StepChip step={step} selected={selected} onSelect={() => selectStep(stepId)} />
      <div className="ml-4 mt-1 flex flex-col gap-2 border-l-2 border-base-300 pl-3">
        {step.branches.map((arm) => (
          <ArmEditor key={arm.id} branch={step} arm={arm} />
        ))}
      </div>
    </div>
  );
};
