import type { Step } from "../schema";

import { useRunnerStore } from "../store/runnerStore";
import { counterNextValue, drawRandomSelect, shuffleAssign } from "./toolOperate";

// ツールの操作 UI (execute モード)。旧ツールノードの設定 DetailPanel を再利用しつつ、
// フラグを書き換える「操作」ボタンを添える (docs: tools は "open/operate" UI でフラグを直接変更)。
export const RunnerToolPanel = ({ step }: { step: Step }) => {
  const setFlag = useRunnerStore((state) => state.setFlag);
  const setFlags = useRunnerStore((state) => state.setFlags);
  const updateStep = useRunnerStore((state) => state.updateStep);
  const gameFlags = useRunnerStore((state) => state.gameFlags);

  return (
    <div className="flex flex-col gap-3">
      <OperateSection
        step={step}
        gameFlags={gameFlags}
        setFlag={setFlag}
        setFlags={setFlags}
        updateStep={updateStep}
      />
    </div>
  );
};

interface OperateSectionProps {
  step: Step;
  gameFlags: Record<string, string>;
  setFlag: (key: string, value: string) => void;
  setFlags: (patch: Record<string, string>) => void;
  updateStep: (id: string, patch: Omit<Partial<Step>, "type">) => void;
}

const OperateSection = ({
  step,
  gameFlags,
  setFlag,
  setFlags,
  updateStep,
}: OperateSectionProps) => {
  if (step.type === "Counter") {
    const key = step.flagKey.trim();
    const current = key === "" ? undefined : gameFlags[key];
    return (
      <div className="rounded border border-base-300 p-3">
        <p className="mb-2 text-sm">
          現在値: <span className="font-mono font-semibold">{current ?? "(未設定)"}</span>
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={key === ""}
          onClick={() => setFlag(key, counterNextValue(current, step.step))}
        >
          +{step.step} する
        </button>
      </div>
    );
  }

  if (step.type === "RandomSelect") {
    const key = step.resultFlagKey.trim();
    return (
      <div className="rounded border border-base-300 p-3">
        <p className="mb-2 text-sm">
          抽選結果: <span className="font-semibold">{step.selectedItem ?? "(未抽選)"}</span>
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={key === "" || step.items.length === 0}
          onClick={() => {
            const selected = drawRandomSelect(step.items);
            if (selected === undefined) return;
            setFlag(key, selected);
            updateStep(step.id, { selectedItem: selected } as Partial<Step>);
          }}
        >
          抽選する
        </button>
      </div>
    );
  }

  if (step.type === "ShuffleAssign") {
    const prefix = step.resultFlagPrefix.trim();
    return (
      <div className="rounded border border-base-300 p-3">
        <p className="mb-2 text-sm font-semibold">シャッフル割り当て</p>
        {step.assignedResults !== undefined && (
          <ul className="mb-2 text-xs">
            {Object.entries(step.assignedResults).map(([target, items]) => (
              <li key={target}>
                {target}: {items.join(", ")}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={prefix === "" || step.items.length === 0 || step.targets.length === 0}
          onClick={() => {
            const result = shuffleAssign(step.items, step.targets, prefix);
            if (result === undefined) return;
            setFlags(result.flagPatch);
            updateStep(step.id, { assignedResults: result.assignedResults } as Partial<Step>);
          }}
        >
          シャッフルする
        </button>
      </div>
    );
  }

  // Kanban / RecordCombination は下部の盤面 (registry DetailPanel) を直接操作する。
  return <p className="text-xs text-base-content/60">下の盤面を直接操作してください。</p>;
};
