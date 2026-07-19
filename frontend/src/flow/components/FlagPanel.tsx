import { useState } from "react";

import { formatFlagValue } from "../resources";
import { useEditorStore } from "../store/editorStore";

// D3: 常駐するゲームフラグパネル (右カラム)。
// edit モードでは Template.gameFlags (セッション開始時の seed) を編集する。
export const FlagPanel = () => {
  const gameFlags = useEditorStore((state) => state.gameFlags);
  const setGameFlag = useEditorStore((state) => state.setGameFlag);
  const removeGameFlag = useEditorStore((state) => state.removeGameFlag);
  const [newKey, setNewKey] = useState("");

  const entries = Object.entries(gameFlags);
  const trimmedNewKey = newKey.trim();
  const canAdd = trimmedNewKey !== "" && !(trimmedNewKey in gameFlags);

  const addFlag = () => {
    if (!canAdd) return;
    setGameFlag(trimmedNewKey, "");
    setNewKey("");
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="text-sm font-semibold">ゲームフラグ (初期値)</h3>
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
            value={formatFlagValue(value)}
            onChange={(event) => setGameFlag(key, event.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            aria-label="フラグを削除"
            onClick={() => removeGameFlag(key)}
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
