import { type Node, type NodeProps } from "@xyflow/react";
import { useRef, useMemo, useState, useEffect } from "react";
import { HiPencil } from "react-icons/hi";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  cn,
  BaseNodeDataSchema,
  NODE_CONTENT_HEIGHTS,
  NODE_TYPE_WIDTHS,
} from "../base";
import { PortaledSelect } from "../utils";

// ============================================================
// Schema Definitions
// ============================================================

const OptionItemSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const RecordedPairSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  recordedAt: z.coerce.date(),
  memo: z.string().optional(),
});

const CombinationConfigSchema = z.object({
  mode: z.enum(["same-set", "different-set"]),
  allowSelfPairing: z.boolean().default(false),
  allowDuplicates: z.boolean().default(false),
  distinguishOrder: z.boolean().default(true), // true: A→B ≠ B→A, false: A-B = B-A
  allowMultipleAssignments: z.boolean().default(false),
});

const SourceOptionsSchema = z.object({
  label: z.string().default("選択肢A"),
  items: z.array(OptionItemSchema),
});

const TargetOptionsSchema = z.object({
  label: z.string().default("選択肢B"),
  items: z.array(OptionItemSchema),
});

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("組み合わせを記録"),
  config: CombinationConfigSchema,
  sourceOptions: SourceOptionsSchema,
  targetOptions: TargetOptionsSchema.optional(),
  recordedPairs: z.array(RecordedPairSchema).default([]),
});

export type RecordCombinationNodeData = z.infer<typeof DataSchema>;
type RecordCombinationNode = Node<RecordCombinationNodeData, "RecordCombination">;

// ============================================================
// Types
// ============================================================

type OptionItem = z.infer<typeof OptionItemSchema>;
type RecordedPair = z.infer<typeof RecordedPairSchema>;
type CombinationConfig = z.infer<typeof CombinationConfigSchema>;

interface FilteredOption extends OptionItem {
  isDisabled: boolean;
  disabledReason: string;
}

// ============================================================
// Utility Functions
// ============================================================

function generateId(): string {
  return crypto.randomUUID();
}

function getFilteredTargetOptions(
  config: CombinationConfig,
  sourceOptions: OptionItem[],
  targetOptions: OptionItem[] | undefined,
  recordedPairs: RecordedPair[],
  selectedSourceId: string | null,
): FilteredOption[] {
  const baseTargets = config.mode === "same-set" ? sourceOptions : (targetOptions ?? []);

  return baseTargets.map((option) => {
    let isDisabled = false;
    let disabledReason = "";

    if (config.mode === "same-set" && !config.allowSelfPairing && option.id === selectedSourceId) {
      isDisabled = true;
      disabledReason = "自分自身とはペアになれません";
    }

    if (!isDisabled && !config.allowDuplicates && selectedSourceId) {
      const existingPair = recordedPairs.find((pair) => {
        if (config.distinguishOrder) {
          // 順序を区別: A→B と B→A は別扱い
          return pair.sourceId === selectedSourceId && pair.targetId === option.id;
        }
        // 順序を区別しない: A-B と B-A は同じ扱い
        return (
          (pair.sourceId === selectedSourceId && pair.targetId === option.id) ||
          (pair.sourceId === option.id && pair.targetId === selectedSourceId)
        );
      });
      if (existingPair) {
        isDisabled = true;
        disabledReason = "既に記録済みです";
      }
    }

    return { ...option, isDisabled, disabledReason };
  });
}

function validatePair(
  config: CombinationConfig,
  recordedPairs: RecordedPair[],
  sourceId: string,
  targetId: string,
): { valid: boolean; error?: string } {
  if (!sourceId || !targetId) {
    return { valid: false, error: "両方を選択してください" };
  }

  if (config.mode === "same-set" && !config.allowSelfPairing && sourceId === targetId) {
    return { valid: false, error: "自分自身とはペアになれません" };
  }

  if (!config.allowDuplicates) {
    const isDuplicate = recordedPairs.some((pair) => {
      if (config.distinguishOrder) {
        // 順序を区別: A→B と B→A は別扱い
        return pair.sourceId === sourceId && pair.targetId === targetId;
      }
      // 順序を区別しない: A-B と B-A は同じ扱い
      return (
        (pair.sourceId === sourceId && pair.targetId === targetId) ||
        (pair.sourceId === targetId && pair.targetId === sourceId)
      );
    });
    if (isDuplicate) {
      return { valid: false, error: "このペアは既に記録されています" };
    }
  }

  return { valid: true };
}

// ============================================================
// Sub Components
// ============================================================

interface OptionListEditorProps {
  label: string;
  items: OptionItem[];
  onItemsChange: (items: OptionItem[]) => void;
  disabled?: boolean;
}

function OptionListEditor({ label, items, onItemsChange, disabled }: OptionListEditorProps) {
  const handleLabelChange = (index: number, newLabel: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], label: newLabel };
    onItemsChange(updated);
  };

  const handleAdd = () => {
    onItemsChange([...items, { id: generateId(), label: "" }]);
  };

  const handleRemove = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-base-content/70">{label}</div>
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-2 items-center">
          <input
            type="text"
            className="nodrag input input-bordered input-sm flex-1"
            value={item.label}
            onChange={(e) => handleLabelChange(index, e.target.value)}
            placeholder={`${label}名を入力`}
            disabled={disabled}
          />
          {!disabled && (
            <button
              type="button"
              className="nodrag btn btn-ghost btn-sm btn-square"
              onClick={() => handleRemove(index)}
              title="削除"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" className="nodrag btn btn-ghost btn-sm" onClick={handleAdd}>
          + {label}を追加
        </button>
      )}
    </div>
  );
}

interface EditableTitleProps {
  title: string;
  defaultTitle: string;
  onTitleChange: (newTitle: string) => void;
}

function EditableTitle({ title, defaultTitle, onTitleChange }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const handleConfirm = () => {
    onTitleChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          ref={inputRef}
          type="text"
          className="nodrag input input-bordered input-xs flex-1 font-semibold"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleConfirm}
          placeholder={defaultTitle}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <span className="font-semibold truncate">{title || defaultTitle}</span>
      <button
        type="button"
        className="nodrag btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100 shrink-0"
        onClick={handleStartEdit}
        title="ノード名を編集"
      >
        <HiPencil className="w-3 h-3" />
      </button>
    </div>
  );
}

interface PairingInputFormProps {
  config: CombinationConfig;
  sourceOptions: OptionItem[];
  targetOptions: FilteredOption[];
  sourceLabel: string;
  targetLabel: string;
  recordedPairs: RecordedPair[];
  onRecord: (sourceId: string, targetId: string) => void;
  disabled?: boolean;
}

function PairingInputForm({
  config,
  sourceOptions,
  targetOptions,
  sourceLabel,
  targetLabel,
  recordedPairs,
  onRecord,
  disabled,
}: PairingInputFormProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");

  const currentTargetOptions = useMemo(() => {
    if (!selectedSourceId) return targetOptions;
    return targetOptions.map((opt) => {
      if (config.mode === "same-set" && !config.allowSelfPairing && opt.id === selectedSourceId) {
        return { ...opt, isDisabled: true, disabledReason: "自分自身とはペアになれません" };
      }
      if (!config.allowDuplicates) {
        const existingPair = recordedPairs.find((pair) => {
          if (config.distinguishOrder) {
            // 順序を区別: A→B と B→A は別扱い
            return pair.sourceId === selectedSourceId && pair.targetId === opt.id;
          }
          // 順序を区別しない: A-B と B-A は同じ扱い
          return (
            (pair.sourceId === selectedSourceId && pair.targetId === opt.id) ||
            (pair.sourceId === opt.id && pair.targetId === selectedSourceId)
          );
        });
        if (existingPair) {
          return { ...opt, isDisabled: true, disabledReason: "既に記録済みです" };
        }
      }
      return opt;
    });
  }, [targetOptions, selectedSourceId, config, recordedPairs]);

  const handleRecord = () => {
    if (selectedSourceId && selectedTargetId) {
      onRecord(selectedSourceId, selectedTargetId);
      setSelectedSourceId("");
      setSelectedTargetId("");
    }
  };

  const arrow = config.distinguishOrder ? "→" : "−";

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <PortaledSelect
          options={sourceOptions.map((opt) => ({ id: opt.id, label: opt.label }))}
          value={selectedSourceId}
          onChange={(value) => {
            setSelectedSourceId(value);
            setSelectedTargetId("");
          }}
          placeholder={`${sourceLabel}を選択`}
          disabled={disabled}
          className="flex-1"
        />

        <span className="text-base-content/50">{arrow}</span>

        <PortaledSelect
          options={currentTargetOptions}
          value={selectedTargetId}
          onChange={setSelectedTargetId}
          placeholder={`${config.mode === "same-set" ? sourceLabel : targetLabel}を選択`}
          disabled={disabled || !selectedSourceId}
          className="flex-1"
        />
      </div>

      <button
        type="button"
        className="nodrag btn btn-primary btn-sm w-full"
        onClick={handleRecord}
        disabled={disabled || !selectedSourceId || !selectedTargetId}
      >
        記録する
      </button>
    </div>
  );
}

interface PairingTimelineProps {
  pairs: RecordedPair[];
  sourceOptions: OptionItem[];
  targetOptions: OptionItem[];
  distinguishOrder: boolean;
  onDelete?: (pairId: string) => void;
}

function PairingTimeline({
  pairs,
  sourceOptions,
  targetOptions,
  distinguishOrder,
  onDelete,
}: PairingTimelineProps) {
  const getLabel = (id: string) => {
    const source = sourceOptions.find((o) => o.id === id);
    if (source) return source.label || "(未入力)";
    const target = targetOptions.find((o) => o.id === id);
    if (target) return target.label || "(未入力)";
    return "(不明)";
  };

  const arrow = distinguishOrder ? "→" : "−";

  if (pairs.length === 0) {
    return (
      <div className="text-sm text-base-content/50 text-center py-2">まだ記録がありません</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-base-content/70">記録履歴 ({pairs.length}件)</div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {pairs.map((pair, index) => (
          <div
            key={pair.id}
            className="flex items-center justify-between text-sm bg-base-200 rounded px-2 py-1"
          >
            <span>
              {index + 1}. {getLabel(pair.sourceId)} {arrow} {getLabel(pair.targetId)}
            </span>
            {onDelete && (
              <button
                type="button"
                className="nodrag btn btn-ghost btn-xs btn-square"
                onClick={() => onDelete(pair.id)}
                title="削除"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export const RecordCombinationNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<RecordCombinationNode> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;

  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };

  const handleSourceOptionsChange = (items: OptionItem[]) => {
    updateNodeData(id, {
      sourceOptions: { ...data.sourceOptions, items },
    });
  };

  const handleTargetOptionsChange = (items: OptionItem[]) => {
    updateNodeData(id, {
      targetOptions: { label: data.targetOptions?.label ?? "選択肢B", items },
    });
  };

  const handleConfigChange = (key: keyof CombinationConfig, value: boolean | string) => {
    updateNodeData(id, {
      config: { ...data.config, [key]: value },
    });
  };

  const handleRecordPair = (sourceId: string, targetId: string) => {
    const validation = validatePair(data.config, data.recordedPairs, sourceId, targetId);
    if (!validation.valid) {
      return;
    }

    const newPair: RecordedPair = {
      id: generateId(),
      sourceId,
      targetId,
      recordedAt: new Date(),
    };

    updateNodeData(id, {
      recordedPairs: [...data.recordedPairs, newPair],
    });
  };

  const handleDeletePair = (pairId: string) => {
    updateNodeData(id, {
      recordedPairs: data.recordedPairs.filter((p) => p.id !== pairId),
    });
  };

  const filteredTargetOptions = useMemo(
    () =>
      getFilteredTargetOptions(
        data.config,
        data.sourceOptions.items,
        data.targetOptions?.items,
        data.recordedPairs,
        null,
      ),
    [data.config, data.sourceOptions.items, data.targetOptions?.items, data.recordedPairs],
  );

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.RecordCombination}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>{data.title || "組み合わせを記録"}</BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="組み合わせを記録"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>

      <BaseNodeContent>
        {!isExecuteMode && (
          <>
            {/* Config Section - 固定表示 */}
            <div className="collapse collapse-arrow bg-base-200 shrink-0">
              <input type="checkbox" className="nodrag" />
              <div className="collapse-title text-sm font-medium py-2 min-h-0">設定</div>
              <div className="collapse-content space-y-2">
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2 py-1">
                    <input
                      type="radio"
                      name={`mode-${id}`}
                      className="nodrag radio radio-sm"
                      checked={data.config.mode === "same-set"}
                      onChange={() => handleConfigChange("mode", "same-set")}
                    />
                    <span className="label-text text-xs">同一集合（A−A）</span>
                  </label>
                  <label className="label cursor-pointer justify-start gap-2 py-1">
                    <input
                      type="radio"
                      name={`mode-${id}`}
                      className="nodrag radio radio-sm"
                      checked={data.config.mode === "different-set"}
                      onChange={() => handleConfigChange("mode", "different-set")}
                    />
                    <span className="label-text text-xs">異なる集合（A→B）</span>
                  </label>
                </div>

                <div className="divider my-1" />

                <div className="flex flex-col gap-1">
                  <label className="label cursor-pointer justify-start gap-2 py-1">
                    <input
                      type="checkbox"
                      className="nodrag checkbox checkbox-sm"
                      checked={data.config.allowDuplicates}
                      onChange={(e) => handleConfigChange("allowDuplicates", e.target.checked)}
                    />
                    <span className="label-text text-xs">重複ペアを許可</span>
                  </label>

                  {data.config.mode === "same-set" && (
                    <label className="label cursor-pointer justify-start gap-2 py-1">
                      <input
                        type="checkbox"
                        className="nodrag checkbox checkbox-sm"
                        checked={data.config.distinguishOrder}
                        onChange={(e) => handleConfigChange("distinguishOrder", e.target.checked)}
                      />
                      <span className="label-text text-xs">順序を区別する（A→B ≠ B→A）</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Options - スクロール領域 */}
            <div
              className="flex flex-col gap-4 overflow-y-auto nowheel"
              style={{ maxHeight: NODE_CONTENT_HEIGHTS.md }}
            >
              <OptionListEditor
                label={data.sourceOptions.label}
                items={data.sourceOptions.items}
                onItemsChange={handleSourceOptionsChange}
              />

              {data.config.mode === "different-set" && (
                <>
                  <div className="divider my-0" />
                  <OptionListEditor
                    label={data.targetOptions?.label ?? "選択肢B"}
                    items={data.targetOptions?.items ?? []}
                    onItemsChange={handleTargetOptionsChange}
                  />
                </>
              )}
            </div>
          </>
        )}

        {isExecuteMode && (
          <>
            {/* Pairing Input Form */}
            <PairingInputForm
              config={data.config}
              sourceOptions={data.sourceOptions.items}
              targetOptions={filteredTargetOptions}
              sourceLabel={data.sourceOptions.label}
              targetLabel={data.targetOptions?.label ?? "選択肢B"}
              recordedPairs={data.recordedPairs}
              onRecord={handleRecordPair}
              disabled={isExecuted}
            />

            <div className="divider my-2" />

            {/* Timeline */}
            <PairingTimeline
              pairs={data.recordedPairs}
              sourceOptions={data.sourceOptions.items}
              targetOptions={
                data.config.mode === "same-set"
                  ? data.sourceOptions.items
                  : (data.targetOptions?.items ?? [])
              }
              distinguishOrder={data.config.distinguishOrder}
              onDelete={isExecuted ? undefined : handleDeletePair}
            />
          </>
        )}
      </BaseNodeContent>

      <BaseNodeFooter>
        <div className="text-xs text-base-content/50">{data.recordedPairs.length}件記録済み</div>
      </BaseNodeFooter>
    </BaseNode>
  );
};
