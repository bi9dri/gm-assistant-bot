import { useState } from "react";

import { useRunnerStore } from "../store/runnerStore";

// D3: execute モードの常駐ゲームフラグパネル (右カラム)。
// ライブな GameSession.gameFlags を編集する。scripted な SetGameFlag / ツール操作と共存し、
// ここでの編集は動作中セッションのフラグを直接書き換える。
export const RunnerFlagPanel = () => {
  const gameFlags = useRunnerStore((state) => state.gameFlags);
  const setFlag = useRunnerStore((state) => state.setFlag);
  const removeFlag = useRunnerStore((state) => state.removeFlag);
  const [newKey, setNewKey] = useState("");

  const entries = Object.entries(gameFlags);
  const trimmedNewKey = newKey.trim();
  const canAdd = trimmedNewKey !== "" && !(trimmedNewKey in gameFlags);

  const addFlag = () => {
    if (!canAdd) return;
    setFlag(trimmedNewKey, "");
    setNewKey("");
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="text-sm font-semibold">ゲームフラグ (実行中)</h3>
      {entries.length === 0 && (
        <p className="text-xs text-base-content/40">フラグはまだありません</p>
      )}
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-1">
          <span className="badge badge-outline badge-sm max-w-24 shrink-0 truncate" title={key}>
            {key}
          </span>
          <input
            className="input input-bordered input-xs flex-1"
            value={value}
            onChange={(event) => setFlag(key, event.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            aria-label="フラグを削除"
            onClick={() => removeFlag(key)}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1 pt-1">
        <input
          className="input input-bordered input-xs flex-1"
          placeholder="新しいフラグ名"
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addFlag();
          }}
        />
        <button
          type="button"
          className="btn btn-primary btn-xs"
          disabled={!canAdd}
          onClick={addFlag}
        >
          追加
        </button>
      </div>
    </div>
  );
};
