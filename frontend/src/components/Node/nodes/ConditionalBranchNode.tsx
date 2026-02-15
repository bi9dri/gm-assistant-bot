import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useRef, useState, useEffect } from "react";
import { HiPencil, HiChevronUp, HiChevronDown } from "react-icons/hi";
import z from "zod";

import { GameSession } from "@/db";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  LabeledHandle,
  cn,
  BaseNodeDataSchema,
  NODE_CONTENT_HEIGHTS,
  NODE_TYPE_WIDTHS,
} from "../base";
import { useNodeExecutionOptional } from "../contexts";
import { evaluateConditions, type GameFlags } from "../utils";

const ConditionSchema = z.object({
  id: z.string(),
  flagKey: z.string(),
  operator: z.enum(["equals", "notEquals", "contains", "exists", "notExists"]),
  value: z.string(),
});

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().min(1).default("条件分岐"),
  conditions: z.array(ConditionSchema).min(1),
  hasDefaultBranch: z.boolean().default(true),
  evaluatedConditionId: z.string().optional(),
});

type Condition = z.infer<typeof ConditionSchema>;
type ConditionalBranchNodeData = Node<z.infer<typeof DataSchema>, "ConditionalBranch">;

function generateId(): string {
  return crypto.randomUUID();
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

const OPERATOR_LABELS = {
  equals: "等しい",
  notEquals: "等しくない",
  contains: "含む",
  exists: "存在する",
  notExists: "存在しない",
};

interface ConditionEditorProps {
  conditions: Condition[];
  onConditionsChange: (conditions: Condition[]) => void;
  disabled?: boolean;
}

function ConditionEditor({ conditions, onConditionsChange, disabled }: ConditionEditorProps) {
  const handleFieldChange = (index: number, field: keyof Condition, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    onConditionsChange(updated);
  };

  const handleAdd = () => {
    onConditionsChange([
      ...conditions,
      { id: generateId(), flagKey: "", operator: "equals", value: "" },
    ]);
  };

  const handleRemove = (index: number) => {
    if (conditions.length <= 1) return;
    onConditionsChange(conditions.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...conditions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onConditionsChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === conditions.length - 1) return;
    const updated = [...conditions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onConditionsChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-base-content/70">条件リスト</div>
      {conditions.map((condition, index) => (
        <div key={condition.id} className="border border-base-300 rounded p-2 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-base-content/70">条件 #{index + 1}</span>
            {!disabled && (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-xs btn-square"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  title="上へ"
                >
                  <HiChevronUp />
                </button>
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-xs btn-square"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === conditions.length - 1}
                  title="下へ"
                >
                  <HiChevronDown />
                </button>
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-xs btn-square"
                  onClick={() => handleRemove(index)}
                  disabled={conditions.length <= 1}
                  title="削除"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            className="nodrag input input-bordered input-sm w-full"
            value={condition.flagKey}
            onChange={(e) => handleFieldChange(index, "flagKey", e.target.value)}
            placeholder="フラグ名 (例: team)"
            disabled={disabled}
          />

          <select
            className="nodrag select select-bordered select-sm w-full"
            value={condition.operator}
            onChange={(e) =>
              handleFieldChange(index, "operator", e.target.value as Condition["operator"])
            }
            disabled={disabled}
          >
            {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {condition.operator !== "exists" && condition.operator !== "notExists" && (
            <input
              type="text"
              className="nodrag input input-bordered input-sm w-full"
              value={condition.value}
              onChange={(e) => handleFieldChange(index, "value", e.target.value)}
              placeholder="値"
              disabled={disabled}
            />
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" className="nodrag btn btn-ghost btn-sm" onClick={handleAdd}>
          + 条件を追加
        </button>
      )}
    </div>
  );
}

interface ConditionSummaryProps {
  conditions: Condition[];
  evaluatedConditionId?: string;
}

function ConditionSummary({ conditions, evaluatedConditionId }: ConditionSummaryProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-base-content/70">条件リスト</div>
      {conditions.map((condition, index) => {
        const isEvaluated = evaluatedConditionId === condition.id;
        return (
          <div
            key={condition.id}
            className={cn(
              "border rounded p-2",
              isEvaluated
                ? "border-success bg-success/10"
                : "border-base-300 bg-base-100/50 opacity-60",
            )}
          >
            <div className="text-xs font-medium text-base-content/70 mb-1">
              条件 #{index + 1}
              {isEvaluated && <span className="ml-2 text-success">✓ マッチ</span>}
            </div>
            <div className="text-sm">
              <span className="font-mono">{condition.flagKey || "(未設定)"}</span>
              <span className="mx-2 text-base-content/50">
                {OPERATOR_LABELS[condition.operator]}
              </span>
              {condition.operator !== "exists" && condition.operator !== "notExists" && (
                <span className="font-mono">{condition.value || "(未設定)"}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const ConditionalBranchNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<ConditionalBranchNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const updateEdgeStyles = useTemplateEditorStore((state) => state.updateEdgeStyles);
  const clearEdgeStyles = useTemplateEditorStore((state) => state.clearEdgeStyles);
  const deleteEdges = useTemplateEditorStore((state) => state.deleteEdges);
  const edges = useTemplateEditorStore((state) => state.edges);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.evaluatedConditionId;

  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };

  const handleConditionsChange = (conditions: Condition[]) => {
    const oldConditions = data.conditions;
    const removedIds = oldConditions
      .filter((old) => !conditions.find((c) => c.id === old.id))
      .map((c) => c.id);

    if (removedIds.length > 0) {
      const edgesToDelete = edges.filter(
        (edge) =>
          edge.source === id &&
          removedIds.some((condId) => edge.sourceHandle === `source-cond-${condId}`),
      );
      if (edgesToDelete.length > 0) {
        deleteEdges(edgesToDelete.map((e) => e.id));
      }
    }

    updateNodeData(id, { conditions });
  };

  const handleDefaultBranchChange = (hasDefaultBranch: boolean) => {
    if (!hasDefaultBranch) {
      const defaultEdges = edges.filter(
        (edge) => edge.source === id && edge.sourceHandle === "source-default",
      );
      if (defaultEdges.length > 0) {
        deleteEdges(defaultEdges.map((e) => e.id));
      }
    }
    updateNodeData(id, { hasDefaultBranch });
  };

  const handleEvaluate = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { sessionId } = executionContext;
    setIsLoading(true);

    try {
      const session = await GameSession.getById(sessionId);
      if (!session) {
        addToast({ message: "セッションが見つかりません", status: "error" });
        return;
      }

      const gameFlags = session.getParsedGameFlags();
      const matchedConditionId = evaluateConditions(data.conditions, gameFlags as GameFlags);

      const activeHandleIds: string[] = [];
      if (matchedConditionId) {
        activeHandleIds.push(`source-cond-${matchedConditionId}`);
      } else if (data.hasDefaultBranch) {
        activeHandleIds.push("source-default");
      }

      updateEdgeStyles(id, activeHandleIds);

      updateNodeData(id, {
        evaluatedConditionId: matchedConditionId ?? "default",
        executedAt: new Date(),
      });

      if (matchedConditionId) {
        const conditionIndex = data.conditions.findIndex((c) => c.id === matchedConditionId) + 1;
        addToast({
          message: `条件 #${conditionIndex} にマッチしました`,
          status: "success",
          durationSeconds: 5,
        });
      } else {
        addToast({
          message: "デフォルト分岐を選択しました",
          status: "info",
          durationSeconds: 5,
        });
      }
    } catch {
      addToast({
        message: "条件評価に失敗しました",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (isExecuteMode && data.evaluatedConditionId) {
        clearEdgeStyles(id);
      }
    };
  }, [isExecuteMode, data.evaluatedConditionId, id, clearEdgeStyles]);

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.ConditionalBranch}
      className={cn("bg-base-300", data.evaluatedConditionId && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>{data.title || "条件分岐"}</BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="条件分岐"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>

      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        {!isExecuteMode && (
          <>
            <ConditionEditor
              conditions={data.conditions}
              onConditionsChange={handleConditionsChange}
              disabled={isLoading}
            />

            <div className="divider my-2" />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="nodrag checkbox checkbox-sm"
                checked={data.hasDefaultBranch}
                onChange={(e) => handleDefaultBranchChange(e.target.checked)}
                disabled={isLoading}
              />
              <span className="text-sm">デフォルト分岐を有効にする</span>
            </label>
          </>
        )}

        {isExecuteMode && (
          <ConditionSummary
            conditions={data.conditions}
            evaluatedConditionId={
              data.evaluatedConditionId === "default" ? undefined : data.evaluatedConditionId
            }
          />
        )}
      </BaseNodeContent>

      <BaseNodeFooter>
        <button
          type="button"
          className="nodrag btn btn-primary w-full"
          onClick={handleEvaluate}
          disabled={!isExecuteMode || isExecuted || isLoading}
        >
          {isLoading && <span className="loading loading-spinner loading-sm" />}
          判定する
        </button>
      </BaseNodeFooter>

      <BaseHandle id="target-1" type="target" position={Position.Top} />

      {data.conditions.map((condition, index) => (
        <LabeledHandle
          key={condition.id}
          id={`source-cond-${condition.id}`}
          type="source"
          position={Position.Right}
          title={`#${index + 1}`}
          style={{
            top: `${((index + 1) / (data.conditions.length + (data.hasDefaultBranch ? 2 : 1))) * 100}%`,
          }}
        />
      ))}

      {data.hasDefaultBranch && (
        <LabeledHandle
          id="source-default"
          type="source"
          position={Position.Right}
          title="default"
          style={{
            top: `${((data.conditions.length + 1) / (data.conditions.length + 2)) * 100}%`,
          }}
        />
      )}
    </BaseNode>
  );
};
