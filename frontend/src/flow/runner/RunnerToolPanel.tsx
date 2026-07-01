import type { Step } from "../schema";

import { useRunnerStore } from "../store/runnerStore";
import { counterNextValue, drawRandomSelect, shuffleAssign } from "./toolOperate";

// ツールの操作 UI (execute モード)。旧ツールノードの設定 DetailPanel を再利用しつつ、
// フラグを書き換える「操作」ボタンを添える (docs: tools は "open/operate" UI でフラグを直接変更)。
// 操作結果はゲームフラグにのみ書き込み、表示もフラグから読む (ステップ本体は書き換えない)。
export const RunnerToolPanel = ({ step }: { step: Step }) => {
  const setFlag = useRunnerStore((state) => state.setFlag);
  const setFlags = useRunnerStore((state) => state.setFlags);
  const gameFlags = useRunnerStore((state) => state.gameFlags);

  return (
    <div className="flex flex-col gap-3">
      <OperateSection step={step} gameFlags={gameFlags} setFlag={setFlag} setFlags={setFlags} />
    </div>
  );
};

interface OperateSectionProps {
  step: Step;
  gameFlags: Record<string, string>;
  setFlag: (key: string, value: string) => void;
  setFlags: (patch: Record<string, string>) => void;
}

const OperateSection = ({ step, gameFlags, setFlag, setFlags }: OperateSectionProps) => {
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
    const result = key === "" ? undefined : gameFlags[key];
    return (
      <div className="rounded border border-base-300 p-3">
        <p className="mb-2 text-sm">
          抽選結果: <span className="font-semibold">{result ?? "(未抽選)"}</span>
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={key === "" || step.items.length === 0}
          onClick={() => {
            const selected = drawRandomSelect(step.items);
            if (selected !== undefined) setFlag(key, selected);
          }}
        >
          抽選する
        </button>
      </div>
    );
  }

  if (step.type === "ShuffleAssign") {
    const prefix = step.resultFlagPrefix.trim();
    const assignments = step.targets
      .map((target) => ({ target: target.trim(), value: gameFlags[`${prefix}_${target.trim()}`] }))
      .filter((entry) => entry.target !== "" && entry.value !== undefined);
    return (
      <div className="rounded border border-base-300 p-3">
        <p className="mb-2 text-sm font-semibold">シャッフル割り当て</p>
        {assignments.length > 0 && (
          <ul className="mb-2 text-xs">
            {assignments.map((entry) => (
              <li key={entry.target}>
                {entry.target}: {entry.value}
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
            if (result !== undefined) setFlags(result.flagPatch);
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
