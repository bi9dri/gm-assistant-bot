import clsx from "clsx";
import { useMemo } from "react";

import { TemplateResourcesOverrideProvider } from "@/components/Node/utils/useTemplateResources";

import type { BranchStep, Step } from "../schema";
import type { RunHandlers } from "./types";

import { getEntry } from "../registry";
import { collectResourcesFromFlow } from "../resources";
import { useRunnerStore } from "../store/runnerStore";
import { findStep } from "../treeOps";
import { RunnerToolPanel } from "./RunnerToolPanel";

// 中央カラム (execute モード)。選択中ステップの実行操作 + 詳細を表示する。
// - 実行済みステップは read-only (記録保護)。runnable なら [再実行] のみ許す。
// - 未実行の action / auto 分岐は編集可能な DetailPanel + [実行]/[スキップ]。
// - select 分岐は枝ボタンで実行。実行済みでも枝を選び直せる (誤選択のやり直し)。
//   tool は操作 UI。
export const RunnerDetailPanel = ({ handlers }: { handlers: RunHandlers }) => {
  const selectedStepId = useRunnerStore((state) => state.selectedStepId);
  const flowData = useRunnerStore((state) => state.flowData);
  const updateStep = useRunnerStore((state) => state.updateStep);
  const runningStepId = useRunnerStore((state) => state.runningStepId);

  const resources = useMemo(() => collectResourcesFromFlow(flowData), [flowData]);
  const step = selectedStepId === null ? undefined : findStep(flowData, selectedStepId);

  if (step === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-base-content/40">
        ステップを選択してください
      </div>
    );
  }

  const entry = getEntry(step.type);
  const StepDetailPanel = entry?.DetailPanel;
  const isExecuted = step.executedAt !== undefined;
  const isTool = entry?.category === "tool";
  const isRunning = runningStepId !== null;
  const handleChange = (patch: Partial<Step>) => updateStep(step.id, patch);

  return (
    <TemplateResourcesOverrideProvider value={resources}>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <span className="flex-1 font-semibold">{step.title || "(無題)"}</span>
          {isExecuted && <span className="badge badge-success badge-sm">実行済み</span>}
        </div>

        {step.memo.trim() !== "" && (
          <p className="whitespace-pre-wrap rounded bg-base-200 p-2 text-xs text-base-content/70">
            {step.memo}
          </p>
        )}

        <RunControls
          step={step}
          isExecuted={isExecuted}
          isRunning={isRunning}
          handlers={handlers}
        />

        {step.type === "Branch" && step.mode === "select" && (
          <SelectBranchControls
            step={step}
            isExecuted={isExecuted}
            isRunning={isRunning}
            handlers={handlers}
          />
        )}

        {isTool && <RunnerToolPanel step={step} />}

        {StepDetailPanel !== undefined && (
          <>
            <div className="divider my-0" />
            {/* 実行済み action/branch は read-only。tool は常に操作可能。 */}
            <fieldset disabled={isExecuted && !isTool} className="contents">
              <StepDetailPanel step={step} onChange={handleChange} />
            </fieldset>
          </>
        )}
      </div>
    </TemplateResourcesOverrideProvider>
  );
};

interface RunControlsProps {
  step: Step;
  isExecuted: boolean;
  isRunning: boolean;
  handlers: RunHandlers;
}

const RunControls = ({ step, isExecuted, isRunning, handlers }: RunControlsProps) => {
  const entry = getEntry(step.type);
  if (entry?.category === "tool") return null;
  // select 分岐は枝ボタン側で実行するのでここには直接実行ボタンを出さない。
  const isSelectBranch = step.type === "Branch" && step.mode === "select";

  return (
    <div className="flex gap-2">
      {!isSelectBranch && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isRunning}
          onClick={() => handlers.onRun(step.id)}
        >
          {isExecuted ? "再実行" : "実行"}
        </button>
      )}
      {!isExecuted && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={isRunning}
          onClick={() => handlers.onSkip(step.id)}
        >
          スキップ
        </button>
      )}
    </div>
  );
};

interface SelectBranchControlsProps {
  step: BranchStep;
  isExecuted: boolean;
  isRunning: boolean;
  handlers: RunHandlers;
}

const SelectBranchControls = ({
  step,
  isExecuted,
  isRunning,
  handlers,
}: SelectBranchControlsProps) => {
  const chosen = step.executedBranchIds ?? [];
  return (
    <div className="flex flex-col gap-2 rounded border border-base-300 p-3">
      <p className="text-sm font-semibold">
        {isExecuted ? "枝を選び直して実行" : "枝を選んで実行"}
      </p>
      {isExecuted && (
        <p className="text-xs text-base-content/60">
          選び直すと、枝の中のステップの実行・スキップの記録はリセットされます
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {step.branches.map((arm) => {
          const isChosen = chosen.includes(arm.id);
          return (
            <button
              key={arm.id}
              type="button"
              className={clsx("btn btn-sm", isChosen ? "btn-primary" : "btn-outline")}
              disabled={isRunning}
              onClick={() => handlers.onRun(step.id, { branchChoice: arm.id })}
            >
              {isChosen ? "✓ " : ""}
              {arm.label || "(無名の枝)"}
            </button>
          );
        })}
      </div>
    </div>
  );
};
