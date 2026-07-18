import { useMemo, useState } from "react";

import { PortaledSelect } from "@/components/Node/utils/PortaledSelect";
import { getFilteredTargetOptions } from "@/components/Node/utils/recordCombination";

import type { KanbanStep, RecordCombinationStep, Step } from "../schema";

import { generateId } from "../ids";
import { useRunnerStore } from "../store/runnerStore";
import {
  counterNextValue,
  drawRandomSelect,
  kanbanBoardPlacements,
  moveKanbanCard,
  recordPair,
  shuffleAssign,
} from "./toolOperate";

// ツールの操作 UI (execute モード)。旧ツールノードの設定 DetailPanel を再利用しつつ、
// フラグを書き換える「操作」ボタンを添える (docs: tools は "open/operate" UI でフラグを直接変更)。
// Counter/RandomSelect/ShuffleAssign の操作結果はゲームフラグにのみ書き込み、表示もフラグから読む。
// Kanban / RecordCombination は実行時状態 (cardPlacements / recordedPairs) をステップ本体に持つため、
// updateStep でセッションの flowData を直接書き換える (旧ノードの execute モードと同義)。
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

  if (step.type === "Kanban") return <KanbanOperate step={step} />;
  if (step.type === "RecordCombination") return <RecordCombinationOperate step={step} />;

  return null;
};

// Kanban の実行時盤面。カードをドラッグして列間を移動する (cardPlacements を更新)。
// 下部の設定エディタ (initialPlacements) とは独立で、こちらが実行中の現在盤面。
const KanbanOperate = ({ step }: { step: KanbanStep }) => {
  const updateToolState = useRunnerStore((state) => state.updateToolState);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const placements = kanbanBoardPlacements(step);

  const cardsForColumn = (columnId: string) =>
    step.cards.filter((card) =>
      placements.some((p) => p.cardId === card.id && p.columnId === columnId),
    );

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("cardId");
    if (cardId) {
      updateToolState(step.id, { cardPlacements: moveKanbanCard(step, cardId, columnId) });
    }
    setDragOverColumnId(null);
  };

  const handleDragLeave = (e: React.DragEvent, columnId: string) => {
    const relatedTarget = e.relatedTarget as EventTarget | null;
    if (
      !relatedTarget ||
      !(relatedTarget instanceof window.Node) ||
      !e.currentTarget.contains(relatedTarget)
    ) {
      if (dragOverColumnId === columnId) setDragOverColumnId(null);
    }
  };

  if (step.columns.length === 0) {
    return (
      <p className="text-xs text-base-content/60">
        列がありません。下の設定エディタで列とカードを追加してください。
      </p>
    );
  }

  return (
    <div className="rounded border border-base-300 p-3">
      <p className="mb-2 text-sm font-semibold">盤面 (カードをドラッグして移動)</p>
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-1">
          {step.columns.map((column) => (
            <div key={column.id} className="flex min-w-28 max-w-36 flex-col">
              <span
                className="mb-1 truncate text-xs font-medium text-base-content/70"
                title={column.label}
              >
                {column.label}
              </span>
              <div
                className={`min-h-20 flex-1 space-y-1 overflow-y-auto rounded border border-dashed p-1 ${
                  dragOverColumnId === column.id
                    ? "border-primary bg-primary/10"
                    : "border-base-300 bg-base-200/50"
                }`}
                style={{ maxHeight: "150px" }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverColumnId(column.id);
                }}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {cardsForColumn(column.id).map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("cardId", card.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="cursor-grab rounded border border-base-300 bg-base-100 px-1 py-0.5 text-sm shadow-sm active:cursor-grabbing"
                  >
                    {card.label || "(未入力)"}
                  </div>
                ))}
                {cardsForColumn(column.id).length === 0 && (
                  <div className="py-2 text-center text-xs text-base-content/30">ドロップ</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// RecordCombination のペア記録 UI。ペアの選択→記録と記録履歴の削除 (recordedPairs を更新)。
const RecordCombinationOperate = ({ step }: { step: RecordCombinationStep }) => {
  const updateToolState = useRunnerStore((state) => state.updateToolState);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");

  const { config, sourceOptions, targetOptions, recordedPairs } = step;
  const targetItems =
    config.mode === "same-set" ? sourceOptions.items : (targetOptions?.items ?? []);
  const arrow = config.distinguishOrder ? "→" : "−";

  const filteredTargetOptions = useMemo(
    () =>
      getFilteredTargetOptions(
        config,
        sourceOptions.items,
        targetOptions?.items,
        recordedPairs,
        selectedSourceId === "" ? null : selectedSourceId,
      ),
    [config, sourceOptions.items, targetOptions?.items, recordedPairs, selectedSourceId],
  );

  const getLabel = (id: string) => {
    const option =
      sourceOptions.items.find((item) => item.id === id) ??
      targetItems.find((item) => item.id === id);
    return option === undefined ? "(不明)" : option.label || "(未入力)";
  };

  const applyPairs = (pairs: RecordCombinationStep["recordedPairs"]) =>
    updateToolState(step.id, { recordedPairs: pairs });

  const handleRecord = () => {
    const pairs = recordPair(step, selectedSourceId, selectedTargetId, generateId());
    if (pairs === undefined) return;
    applyPairs(pairs);
    setSelectedSourceId("");
    setSelectedTargetId("");
  };

  return (
    <div className="flex flex-col gap-2 rounded border border-base-300 p-3">
      <p className="text-sm font-semibold">ペアを記録</p>
      <div className="flex items-center gap-2">
        <PortaledSelect
          options={sourceOptions.items.map((item) => ({ id: item.id, label: item.label }))}
          value={selectedSourceId}
          onChange={(value) => {
            setSelectedSourceId(value);
            setSelectedTargetId("");
          }}
          placeholder={`${sourceOptions.label}を選択`}
          className="flex-1"
        />
        <span className="text-base-content/50">{arrow}</span>
        <PortaledSelect
          options={filteredTargetOptions}
          value={selectedTargetId}
          onChange={setSelectedTargetId}
          placeholder={`${config.mode === "same-set" ? sourceOptions.label : (targetOptions?.label ?? "選択肢B")}を選択`}
          disabled={selectedSourceId === ""}
          className="flex-1"
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={handleRecord}
        disabled={selectedSourceId === "" || selectedTargetId === ""}
      >
        記録する
      </button>

      <div className="divider my-1" />

      {recordedPairs.length === 0 ? (
        <p className="py-1 text-center text-sm text-base-content/50">まだ記録がありません</p>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-medium text-base-content/70">
            記録履歴 ({recordedPairs.length}件)
          </p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {recordedPairs.map((pair, index) => (
              <div
                key={pair.id}
                className="flex items-center justify-between rounded bg-base-200 px-2 py-1 text-sm"
              >
                <span>
                  {index + 1}. {getLabel(pair.sourceId)} {arrow} {getLabel(pair.targetId)}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  title="削除"
                  onClick={() => applyPairs(recordedPairs.filter((p) => p.id !== pair.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
