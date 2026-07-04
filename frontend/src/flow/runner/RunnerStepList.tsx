import clsx from "clsx";
import { memo } from "react";

import type { BranchStep, Step } from "../schema";
import type { RunHandlers } from "./types";

import { getEntry } from "../registry";
import { CATEGORY_CLASS, CATEGORY_LABEL } from "../registry/category";
import { useRunnerStore } from "../store/runnerStore";
import { canRunStep } from "./canRun";

interface RunnerStepRowProps {
  step: Step;
  handlers: RunHandlers;
}

const RunnerStepRow = memo(({ step, handlers }: RunnerStepRowProps) => {
  const selectStep = useRunnerStore((state) => state.selectStep);
  const selectedStepId = useRunnerStore((state) => state.selectedStepId);
  const cursorId = useRunnerStore((state) => state.cursorId);
  const runningStepId = useRunnerStore((state) => state.runningStepId);
  const skipped = useRunnerStore((state) => state.skippedStepIds.includes(step.id));

  const entry = getEntry(step.type);
  const isSelected = selectedStepId === step.id;
  const isExecuted = step.executedAt !== undefined;
  const isCursor = cursorId === step.id && !isExecuted && !skipped;
  const isRunning = runningStepId !== null;

  const marker = isExecuted ? "✓" : skipped ? "⏭" : isCursor ? "▶" : "";
  const markerClass = isExecuted
    ? "text-success"
    : skipped
      ? "text-base-content/30"
      : isCursor
        ? "text-primary"
        : "text-transparent";

  return (
    <li>
      <div
        className={clsx(
          "flex items-center gap-2 rounded border px-2 py-1",
          isExecuted && "bg-success/10",
          isCursor && !isSelected && "border-primary/50",
          isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-base-200",
        )}
        onClick={() => selectStep(step.id)}
      >
        <span className={clsx("w-4 shrink-0 text-center font-bold", markerClass)}>
          {marker || "·"}
        </span>
        {entry !== undefined && (
          <span className={clsx("badge badge-sm shrink-0", CATEGORY_CLASS[entry.category])}>
            {CATEGORY_LABEL[entry.category]}
          </span>
        )}
        <span className={clsx("flex-1 truncate text-sm", skipped && "line-through opacity-50")}>
          {step.title.trim() !== ""
            ? step.title
            : entry !== undefined
              ? entry.summary(step)
              : step.type}
        </span>
        {step.autoAdvance && (
          <span className="badge badge-ghost badge-sm shrink-0" title="実行後に次を自動実行">
            ⏩
          </span>
        )}
        {isExecuted ? (
          canRunStep(step) && (
            <button
              type="button"
              className="btn btn-ghost btn-xs shrink-0"
              disabled={isRunning}
              onClick={(event) => {
                event.stopPropagation();
                handlers.onRun(step.id);
              }}
            >
              再実行
            </button>
          )
        ) : (
          <>
            {canRunStep(step) && (
              <button
                type="button"
                className="btn btn-primary btn-xs shrink-0"
                disabled={isRunning}
                onClick={(event) => {
                  event.stopPropagation();
                  handlers.onRun(step.id);
                }}
              >
                実行
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-xs shrink-0"
              disabled={isRunning}
              onClick={(event) => {
                event.stopPropagation();
                handlers.onSkip(step.id);
              }}
            >
              スキップ
            </button>
          </>
        )}
      </div>
      {step.type === "Branch" && <RunnerBranchArms step={step} handlers={handlers} />}
    </li>
  );
});
RunnerStepRow.displayName = "RunnerStepRow";

interface RunnerBranchArmsProps {
  step: BranchStep;
  handlers: RunHandlers;
}

// 分岐の枝表示。実行済みなら選ばれた枝の子だけを展開し、選ばれなかった枝は畳む
// (docs: "Unchosen arms collapse in the UI")。未実行ならすべての枝を候補として見せる。
const RunnerBranchArms = ({ step, handlers }: RunnerBranchArmsProps) => {
  const chosen = step.executedBranchIds;
  return (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l-2 border-base-300 pl-2">
      {step.branches.map((arm) => {
        const isChosen = chosen === undefined || chosen.includes(arm.id);
        if (!isChosen) {
          return (
            <span key={arm.id} className="text-xs text-base-content/30 line-through">
              ▸ {arm.label || "(無名の枝)"}
            </span>
          );
        }
        return (
          <div key={arm.id} className="flex flex-col gap-1">
            <span className="text-xs text-base-content/60">
              ▸ {arm.label || "(無名の枝)"}
              {arm.condition === undefined ? " (デフォルト)" : ""}
            </span>
            {arm.steps.length > 0 && <RunnerStepList steps={arm.steps} handlers={handlers} />}
          </div>
        );
      })}
    </div>
  );
};

interface RunnerStepListProps {
  steps: Step[];
  handlers: RunHandlers;
}

// 実行モードのステップリスト。edit の StepList と違い並べ替えは無く、実行状態バッジと
// 実行/再実行/スキップの操作を持つ。
export const RunnerStepList = ({ steps, handlers }: RunnerStepListProps) => {
  if (steps.length === 0) {
    return <p className="px-2 py-1 text-xs text-base-content/40">(ステップなし)</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {steps.map((step) => (
        <RunnerStepRow key={step.id} step={step} handlers={handlers} />
      ))}
    </ul>
  );
};
