import { useMemo } from "react";

import type { Step } from "../schema";

import { getEntry } from "../registry";
import { useRunnerStore } from "../store/runnerStore";
import { collectSteps } from "../treeOps";
import { counterNextValue } from "./toolOperate";

// 右カラム常駐のツール欄 (issue #182)。フロー内の Counter / Kanban / RecordCombination を
// ステップ選択に関わらず任意のタイミングで操作できるようにする。
// - Counter: 単純なのでこの欄で直接 +N 操作する。
// - Kanban / RecordCombination: クリックで該当ステップを選択し、中央カラムの操作 UI で
//   詳細操作する (盤面・記録フォームは右カラムには収まらない)。
const DOCK_TOOL_TYPES = ["Counter", "Kanban", "RecordCombination"] as const;

type DockToolStep = Extract<Step, { type: (typeof DOCK_TOOL_TYPES)[number] }>;

const isDockToolStep = (step: Step): step is DockToolStep =>
  (DOCK_TOOL_TYPES as readonly string[]).includes(step.type);

export const RunnerToolDock = () => {
  const flowData = useRunnerStore((state) => state.flowData);

  const toolSteps = useMemo(() => collectSteps(flowData).filter(isDockToolStep), [flowData]);
  if (toolSteps.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-base-300 p-3">
      <h3 className="text-sm font-semibold">ツール</h3>
      {toolSteps.map((step) =>
        step.type === "Counter" ? (
          <CounterDockRow key={step.id} step={step} />
        ) : (
          <OpenInDetailDockRow key={step.id} step={step} />
        ),
      )}
    </div>
  );
};

const CounterDockRow = ({ step }: { step: Extract<Step, { type: "Counter" }> }) => {
  const gameFlags = useRunnerStore((state) => state.gameFlags);
  const setFlag = useRunnerStore((state) => state.setFlag);

  const key = step.flagKey.trim();
  const current = key === "" ? undefined : gameFlags[key];

  return (
    <div className="flex items-center gap-2 rounded border border-base-300 p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" title={step.title}>
          {step.title || "カウンター"}
        </p>
        <p className="font-mono text-sm">{current ?? "(未設定)"}</p>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-xs shrink-0"
        disabled={key === ""}
        onClick={() => setFlag(key, counterNextValue(current, step.step))}
      >
        +{step.step}
      </button>
    </div>
  );
};

const OpenInDetailDockRow = ({ step }: { step: DockToolStep }) => {
  const selectStep = useRunnerStore((state) => state.selectStep);
  const isSelected = useRunnerStore((state) => state.selectedStepId === step.id);
  const summary = getEntry(step.type)?.summary(step);

  return (
    <button
      type="button"
      className={`flex flex-col items-start gap-0.5 rounded border p-2 text-left ${
        isSelected ? "border-primary bg-primary/10" : "border-base-300 hover:bg-base-200"
      }`}
      onClick={() => selectStep(step.id)}
    >
      <span className="w-full truncate text-xs font-medium" title={step.title}>
        {step.title || summary || step.type}
      </span>
      {summary !== undefined && (
        <span className="w-full truncate text-xs text-base-content/50">{summary}</span>
      )}
    </button>
  );
};
