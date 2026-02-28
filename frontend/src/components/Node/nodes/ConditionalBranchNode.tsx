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
import {
  evaluateConditions,
  type GameFlags,
  type Branch,
  type ConditionNode,
  type RuleNode,
  type GroupNode,
  FlagValueSelector,
  ResourceSelector,
} from "../utils";

// ---- Zod schemas ----

const RuleNodeSchema = z.object({
  type: z.literal("rule"),
  id: z.string(),
  flagKey: z.string(),
  operator: z.enum(["equals", "notEquals", "contains", "exists", "notExists"]),
  value: z.string(),
  valueType: z.enum(["literal", "flag"]).default("literal"),
});

const ConditionNodeSchema: z.ZodType<ConditionNode> = z.union([
  RuleNodeSchema,
  z.object({
    type: z.literal("group"),
    id: z.string(),
    logic: z.enum(["and", "or"]),
    children: z.lazy(() => ConditionNodeSchema.array().min(1)),
  }),
]);

const BranchSchema = z.object({
  id: z.string(),
  root: ConditionNodeSchema,
});

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().min(1).default("条件分岐"),
  conditions: z.array(BranchSchema).min(1),
  hasDefaultBranch: z.boolean().default(true),
  evaluatedConditionId: z.string().optional(),
});

type ConditionalBranchNodeData = Node<z.infer<typeof DataSchema>, "ConditionalBranch">;

function generateId(): string {
  return crypto.randomUUID();
}

// ---- Constants ----

const MAX_NESTING_DEPTH = 4;

const OPERATOR_LABELS = {
  equals: "等しい",
  notEquals: "等しくない",
  contains: "含む",
  exists: "存在する",
  notExists: "存在しない",
};

const GROUP_BORDER_COLORS = ["#60a5fa", "#a78bfa", "#4ade80", "#fb923c"];

function getGroupBorderColor(depth: number): string {
  return GROUP_BORDER_COLORS[depth % GROUP_BORDER_COLORS.length];
}

// ---- EditableTitle ----

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

// ---- RuleEditor ----

interface RuleEditorProps {
  nodeId: string;
  rule: RuleNode;
  onChange: (updated: ConditionNode) => void;
  onRemove?: () => void;
  onWrapInGroup: () => void;
  disabled?: boolean;
}

function RuleEditor({
  nodeId,
  rule,
  onChange,
  onRemove,
  onWrapInGroup,
  disabled,
}: RuleEditorProps) {
  const handleFlagKeyChange = (flagKey: string) => {
    onChange({ ...rule, flagKey, value: "" });
  };

  const handleValueTypeChange = (valueType: RuleNode["valueType"]) => {
    onChange({ ...rule, valueType, value: "" });
  };

  return (
    <div className="border border-base-300 rounded p-2 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-base-content/70">ルール</span>
        {!disabled && (
          <div className="flex gap-1">
            <button
              type="button"
              className="nodrag btn btn-ghost btn-xs"
              onClick={onWrapInGroup}
              title="グループ化"
            >
              グループ化
            </button>
            {onRemove && (
              <button
                type="button"
                className="nodrag btn btn-ghost btn-xs btn-square"
                onClick={onRemove}
                title="削除"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      <ResourceSelector
        nodeId={nodeId}
        resourceType="gameFlag"
        value={rule.flagKey}
        onChange={handleFlagKeyChange}
        placeholder="フラグ名 (例: team)"
        disabled={disabled}
      />

      <select
        className="nodrag select select-bordered select-sm w-full"
        value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value as RuleNode["operator"] })}
        disabled={disabled}
      >
        {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {rule.operator !== "exists" && rule.operator !== "notExists" && (
        <>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                className="nodrag radio radio-xs"
                name={`valueType-${rule.id}`}
                value="literal"
                checked={rule.valueType !== "flag"}
                onChange={() => handleValueTypeChange("literal")}
                disabled={disabled}
              />
              固定値
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                className="nodrag radio radio-xs"
                name={`valueType-${rule.id}`}
                value="flag"
                checked={rule.valueType === "flag"}
                onChange={() => handleValueTypeChange("flag")}
                disabled={disabled}
              />
              フラグの値
            </label>
          </div>
          {rule.valueType === "flag" ? (
            <ResourceSelector
              nodeId={nodeId}
              resourceType="gameFlag"
              value={rule.value}
              onChange={(v) => onChange({ ...rule, value: v })}
              placeholder="比較するフラグ名"
              disabled={disabled}
            />
          ) : (
            <FlagValueSelector
              nodeId={nodeId}
              flagKey={rule.flagKey}
              value={rule.value}
              onChange={(v) => onChange({ ...rule, value: v })}
              placeholder="値"
              disabled={disabled}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---- ConditionNodeEditor (forward declaration for mutual recursion) ----

interface ConditionNodeEditorProps {
  nodeId: string;
  node: ConditionNode;
  onChange: (updated: ConditionNode) => void;
  onRemove?: () => void;
  disabled?: boolean;
  depth: number;
}

function ConditionNodeEditor({
  nodeId,
  node,
  onChange,
  onRemove,
  disabled,
  depth,
}: ConditionNodeEditorProps) {
  if (node.type === "rule") {
    return (
      <RuleEditor
        nodeId={nodeId}
        rule={node}
        onChange={onChange}
        onRemove={onRemove}
        onWrapInGroup={() => {
          onChange({
            type: "group",
            id: generateId(),
            logic: "and",
            children: [node],
          });
        }}
        disabled={disabled}
      />
    );
  }

  return (
    <GroupEditor
      nodeId={nodeId}
      group={node}
      onChange={onChange}
      onRemove={onRemove}
      disabled={disabled}
      depth={depth}
    />
  );
}

// ---- GroupEditor ----

interface GroupEditorProps {
  nodeId: string;
  group: GroupNode;
  onChange: (updated: ConditionNode) => void;
  onRemove?: () => void;
  disabled?: boolean;
  depth: number;
}

function GroupEditor({ nodeId, group, onChange, onRemove, disabled, depth }: GroupEditorProps) {
  const handleChildChange = (index: number, updated: ConditionNode) => {
    const newChildren = [...group.children];
    newChildren[index] = updated;
    onChange({ ...group, children: newChildren });
  };

  const handleChildRemove = (index: number) => {
    const newChildren = group.children.filter((_, i) => i !== index);
    if (newChildren.length === 1) {
      // Auto-unwrap: グループを解除して残り1つの子で置き換える
      onChange(newChildren[0]);
    } else {
      onChange({ ...group, children: newChildren });
    }
  };

  const handleAddRule = () => {
    const newRule: RuleNode = {
      type: "rule",
      id: generateId(),
      flagKey: "",
      operator: "equals",
      value: "",
      valueType: "literal",
    };
    onChange({ ...group, children: [...group.children, newRule] });
  };

  const handleAddGroup = () => {
    const newGroup: GroupNode = {
      type: "group",
      id: generateId(),
      logic: "and",
      children: [
        {
          type: "rule",
          id: generateId(),
          flagKey: "",
          operator: "equals",
          value: "",
          valueType: "literal",
        },
      ],
    };
    onChange({ ...group, children: [...group.children, newGroup] });
  };

  const canRemoveChild = group.children.length > 1;
  const borderColor = getGroupBorderColor(depth);

  return (
    <div className="border rounded p-2 space-y-2" style={{ borderColor }}>
      <div className="flex items-center justify-between">
        <select
          className="nodrag select select-bordered select-xs"
          value={group.logic}
          onChange={(e) => onChange({ ...group, logic: e.target.value as "and" | "or" })}
          disabled={disabled}
        >
          <option value="and">AND (全て満たす)</option>
          <option value="or">OR (いずれか満たす)</option>
        </select>
        {onRemove && !disabled && (
          <button
            type="button"
            className="nodrag btn btn-ghost btn-xs btn-square"
            onClick={onRemove}
            title="グループを削除"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-2 pl-3 border-l-2" style={{ borderLeftColor: borderColor }}>
        {group.children.map((child, index) => (
          <ConditionNodeEditor
            key={child.id}
            nodeId={nodeId}
            node={child}
            onChange={(updated) => handleChildChange(index, updated)}
            onRemove={canRemoveChild ? () => handleChildRemove(index) : undefined}
            disabled={disabled}
            depth={depth + 1}
          />
        ))}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          <button type="button" className="nodrag btn btn-ghost btn-xs" onClick={handleAddRule}>
            + ルール
          </button>
          {depth < MAX_NESTING_DEPTH && (
            <button type="button" className="nodrag btn btn-ghost btn-xs" onClick={handleAddGroup}>
              + グループ
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- BranchEditor ----

interface BranchEditorProps {
  nodeId: string;
  branches: Branch[];
  onBranchesChange: (branches: Branch[]) => void;
  disabled?: boolean;
}

function BranchEditor({ nodeId, branches, onBranchesChange, disabled }: BranchEditorProps) {
  const handleRootChange = (index: number, updated: ConditionNode) => {
    const newBranches = [...branches];
    newBranches[index] = { ...newBranches[index], root: updated };
    onBranchesChange(newBranches);
  };

  const handleAdd = () => {
    onBranchesChange([
      ...branches,
      {
        id: generateId(),
        root: {
          type: "rule",
          id: generateId(),
          flagKey: "",
          operator: "equals",
          value: "",
          valueType: "literal",
        },
      },
    ]);
  };

  const handleRemove = (index: number) => {
    if (branches.length <= 1) return;
    onBranchesChange(branches.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...branches];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onBranchesChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === branches.length - 1) return;
    const updated = [...branches];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onBranchesChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-base-content/70">条件リスト</div>
      {branches.map((branch, index) => (
        <div key={branch.id} className="border border-base-300 rounded p-2 space-y-2">
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
                  disabled={index === branches.length - 1}
                  title="下へ"
                >
                  <HiChevronDown />
                </button>
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-xs btn-square"
                  onClick={() => handleRemove(index)}
                  disabled={branches.length <= 1}
                  title="削除"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <ConditionNodeEditor
            nodeId={nodeId}
            node={branch.root}
            onChange={(updated) => handleRootChange(index, updated)}
            disabled={disabled}
            depth={0}
          />
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

// ---- ConditionNodeSummary ----

interface ConditionNodeSummaryProps {
  node: ConditionNode;
  depth?: number;
}

function ConditionNodeSummary({ node, depth = 0 }: ConditionNodeSummaryProps) {
  if (node.type === "rule") {
    return (
      <div className="text-sm">
        <span className="font-mono">{node.flagKey || "(未設定)"}</span>
        <span className="mx-2 text-base-content/50">{OPERATOR_LABELS[node.operator]}</span>
        {node.operator !== "exists" && node.operator !== "notExists" && (
          <span className="font-mono">
            {node.valueType === "flag" && (
              <span className="text-base-content/50 not-italic">フラグ:</span>
            )}
            {node.value || "(未設定)"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="pl-3 border-l-2" style={{ borderLeftColor: getGroupBorderColor(depth) }}>
      <div className="text-xs font-medium text-base-content/60 mb-1">
        {node.logic === "and" ? "AND (全て)" : "OR (いずれか)"}
      </div>
      <div className="space-y-1">
        {node.children.map((child) => (
          <ConditionNodeSummary key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

// ---- BranchSummary ----

interface BranchSummaryProps {
  branches: Branch[];
  evaluatedConditionId?: string;
}

function BranchSummary({ branches, evaluatedConditionId }: BranchSummaryProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-base-content/70">条件リスト</div>
      {branches.map((branch, index) => {
        const isEvaluated = evaluatedConditionId === branch.id;
        return (
          <div
            key={branch.id}
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
            <ConditionNodeSummary node={branch.root} />
          </div>
        );
      })}
    </div>
  );
}

// ---- ConditionalBranchNode ----

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

  const handleConditionsChange = (conditions: Branch[]) => {
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
            <BranchEditor
              nodeId={id}
              branches={data.conditions}
              onBranchesChange={handleConditionsChange}
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
          <BranchSummary
            branches={data.conditions}
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

      <BaseHandle id="target-1" type="target" position={Position.Left} />

      {data.conditions.map((branch, index) => (
        <LabeledHandle
          key={branch.id}
          id={`source-cond-${branch.id}`}
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
