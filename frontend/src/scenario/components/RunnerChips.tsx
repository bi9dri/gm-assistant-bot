import clsx from "clsx";
import { createContext, useContext } from "react";

import { canRunStep } from "@/flow/runner/canRun";
import type { RunHandlers } from "@/flow/runner/types";
import type { Step } from "@/flow/schema";
import { useRunnerStore } from "@/flow/store/runnerStore";
import { findStepIn } from "@/flow/treeOps";

import { runnerSteps } from "../runner";
import { stepCopyText } from "../textTransfer";
import type { ChipProps } from "./chips";
import { CopyButton } from "./CopyButton";
import { MissingStepChip, StepChip } from "./StepChip";

// 実行モードで文中に描くチップ (docs: scenario-editor-architecture D10)。
// 本文には「既読」のような別状態を持たせない。進捗は executedAt 一本で表す。

// 実行ハンドラは ScenarioRunner が持つが、チップは ProseMirror の中に居て props を
// 受け取れないため context で渡す。
const RunHandlersContext = createContext<RunHandlers | null>(null);
export const RunHandlersProvider = RunHandlersContext.Provider;

const useStep = (stepId: string): Step | undefined =>
  useRunnerStore((state) => findStepIn(runnerSteps(state.flowData), stepId));

// 実行状態のマーカー。実行済み ✓ / スキップ ⏭ / カーソル ▶。
const StateMarker = ({ step }: { step: Step }) => {
  const skipped = useRunnerStore((state) => state.skippedStepIds.includes(step.id));
  const isCursor = useRunnerStore((state) => state.cursorId === step.id);

  if (step.executedAt !== undefined) return <span className="text-success">✓</span>;
  if (skipped) return <span className="text-base-content/30">⏭</span>;
  if (isCursor) return <span className="font-bold text-primary">▶</span>;
  return null;
};

const RunControls = ({ step }: { step: Step }) => {
  const handlers = useContext(RunHandlersContext);
  const isRunning = useRunnerStore((state) => state.runningStepId !== null);
  const isExecuted = step.executedAt !== undefined;

  if (handlers === null) return null;

  return (
    <>
      {/* select 分岐は枝を選ばないと実行できない。右カラムの枝ボタンに任せる。 */}
      {canRunStep(step) && (
        <button
          type="button"
          className={clsx("btn btn-xs", isExecuted ? "btn-ghost" : "btn-primary")}
          disabled={isRunning}
          onClick={() => handlers.onRun(step.id)}
        >
          {isExecuted ? "再実行" : "実行"}
        </button>
      )}
      {!isExecuted && (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={isRunning}
          onClick={() => handlers.onSkip(step.id)}
        >
          スキップ
        </button>
      )}
    </>
  );
};

export const RunnerStepChip = ({ stepId }: ChipProps) => {
  const step = useStep(stepId);
  const selected = useRunnerStore((state) => state.selectedStepId === stepId);
  const selectStep = useRunnerStore((state) => state.selectStep);
  const skipped = useRunnerStore((state) => state.skippedStepIds.includes(stepId));

  if (step === undefined) return <MissingStepChip />;
  const copyText = stepCopyText(step);

  return (
    <span className={clsx("inline-flex items-center gap-1", skipped && "opacity-50")}>
      <StateMarker step={step} />
      <StepChip step={step} selected={selected} onSelect={() => selectStep(stepId)}>
        {copyText !== "" && <CopyButton text={copyText} />}
        <RunControls step={step} />
      </StepChip>
    </span>
  );
};

// 実行済みなら確定した枝だけを展開し、選ばれなかった枝は畳む
// (実行モードのステップリストと同じ見せ方)。
export const RunnerBranchBlock = ({ stepId }: ChipProps) => {
  const step = useStep(stepId);
  const selected = useRunnerStore((state) => state.selectedStepId === stepId);
  const selectStep = useRunnerStore((state) => state.selectStep);

  if (step === undefined || step.type !== "Branch") return <MissingStepChip />;
  const chosen = step.executedBranchIds;

  return (
    <div contentEditable={false} className="rounded border border-base-300 bg-base-200/50 p-2">
      <span className="inline-flex items-center gap-1">
        <StateMarker step={step} />
        <StepChip step={step} selected={selected} onSelect={() => selectStep(stepId)}>
          <RunControls step={step} />
        </StepChip>
      </span>
      <div className="ml-4 mt-1 flex flex-col gap-2 border-l-2 border-base-300 pl-3">
        {step.branches.map((arm) =>
          chosen !== undefined && !chosen.includes(arm.id) ? (
            <span key={arm.id} className="text-xs text-base-content/30 line-through">
              ▸ {arm.label || "(無名の枝)"}
            </span>
          ) : (
            <div key={arm.id} className="flex flex-col gap-1">
              <span className="text-xs text-base-content/60">
                ▸ {arm.label || "(無名の枝)"}
                {step.mode === "auto" && arm.condition === undefined ? " (デフォルト)" : ""}
              </span>
              <div className="flex flex-wrap items-center gap-1 pl-3">
                {arm.steps.map((armStep) => (
                  <RunnerStepChip key={armStep.id} stepId={armStep.id} />
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
};
