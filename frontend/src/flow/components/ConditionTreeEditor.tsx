import type { ConditionNode, GroupNode, RuleNode } from "@/components/Node/utils/evaluateCondition";

import { FlagValueSelector } from "@/components/Node/utils/FlagValueSelector";
import { ResourceSelector } from "@/components/Node/utils/ResourceSelector";

// ConditionalBranchNode から抽出した条件ツリーエディタ (React Flow 非依存)。
// 単一の ConditionNode (rule | group) を controlled に再帰編集する。
// store / Handle / エッジ操作には触れず、value -> onChange のみを行う。

const MAX_NESTING_DEPTH = 4;

const OPERATOR_LABELS = {
  equals: "等しい",
  notEquals: "等しくない",
  contains: "含む",
  exists: "存在する",
  notExists: "存在しない",
} as const;

const GROUP_BORDER_COLORS = ["#60a5fa", "#a78bfa", "#4ade80", "#fb923c"];

const getGroupBorderColor = (depth: number): string =>
  GROUP_BORDER_COLORS[depth % GROUP_BORDER_COLORS.length];

// 「条件を追加」「グループに子を追加」で生成する空ルール。id は採番する。
export const createDefaultRule = (): RuleNode => ({
  type: "rule",
  id: crypto.randomUUID(),
  flagKey: "",
  operator: "equals",
  value: "",
  valueType: "literal",
});

// ---- RuleEditor ----

interface RuleEditorProps {
  nodeId: string;
  rule: RuleNode;
  onChange: (updated: ConditionNode) => void;
  onRemove?: () => void;
  onWrapInGroup: () => void;
}

function RuleEditor({ nodeId, rule, onChange, onRemove, onWrapInGroup }: RuleEditorProps) {
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
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={onWrapInGroup}
            title="グループ化"
          >
            グループ化
          </button>
          {onRemove && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              onClick={onRemove}
              title="削除"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <ResourceSelector
        nodeId={nodeId}
        resourceType="gameFlag"
        value={rule.flagKey}
        onChange={handleFlagKeyChange}
        placeholder="フラグ名 (例: team)"
      />

      <select
        className="select select-bordered select-sm w-full"
        value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value as RuleNode["operator"] })}
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
                className="radio radio-xs"
                name={`valueType-${rule.id}`}
                value="literal"
                checked={rule.valueType !== "flag"}
                onChange={() => handleValueTypeChange("literal")}
              />
              固定値
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                className="radio radio-xs"
                name={`valueType-${rule.id}`}
                value="flag"
                checked={rule.valueType === "flag"}
                onChange={() => handleValueTypeChange("flag")}
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
            />
          ) : (
            <FlagValueSelector
              nodeId={nodeId}
              flagKey={rule.flagKey}
              value={rule.value}
              onChange={(v) => onChange({ ...rule, value: v })}
              placeholder="値"
            />
          )}
        </>
      )}
    </div>
  );
}

// ---- GroupEditor ----

interface GroupEditorProps {
  nodeId: string;
  group: GroupNode;
  onChange: (updated: ConditionNode) => void;
  onRemove?: () => void;
  depth: number;
}

function GroupEditor({ nodeId, group, onChange, onRemove, depth }: GroupEditorProps) {
  const handleChildChange = (index: number, updated: ConditionNode) => {
    onChange({
      ...group,
      children: group.children.map((child, i) => (i === index ? updated : child)),
    });
  };

  const handleChildRemove = (index: number) => {
    const newChildren = group.children.filter((_, i) => i !== index);
    if (newChildren.length === 1) {
      // グループを解除して残り 1 つの子で置き換える
      onChange(newChildren[0]);
    } else {
      onChange({ ...group, children: newChildren });
    }
  };

  const handleAddRule = () => {
    onChange({ ...group, children: [...group.children, createDefaultRule()] });
  };

  const handleAddGroup = () => {
    const newGroup: GroupNode = {
      type: "group",
      id: crypto.randomUUID(),
      logic: "and",
      children: [createDefaultRule()],
    };
    onChange({ ...group, children: [...group.children, newGroup] });
  };

  const canRemoveChild = group.children.length > 1;
  const borderColor = getGroupBorderColor(depth);

  return (
    <div className="border rounded p-2 space-y-2" style={{ borderColor }}>
      <div className="flex items-center justify-between">
        <select
          className="select select-bordered select-xs"
          value={group.logic}
          onChange={(e) => onChange({ ...group, logic: e.target.value as GroupNode["logic"] })}
        >
          <option value="and">AND (全て満たす)</option>
          <option value="or">OR (いずれか満たす)</option>
        </select>
        {onRemove && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square"
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
            depth={depth + 1}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost btn-xs" onClick={handleAddRule}>
          + ルール
        </button>
        {depth < MAX_NESTING_DEPTH && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={handleAddGroup}>
            + グループ
          </button>
        )}
      </div>
    </div>
  );
}

// ---- ConditionNodeEditor (rule / group の相互再帰ディスパッチ) ----

interface ConditionNodeEditorProps {
  nodeId: string;
  node: ConditionNode;
  onChange: (updated: ConditionNode) => void;
  onRemove?: () => void;
  depth: number;
}

function ConditionNodeEditor({
  nodeId,
  node,
  onChange,
  onRemove,
  depth,
}: ConditionNodeEditorProps) {
  if (node.type !== "rule") {
    return (
      <GroupEditor
        nodeId={nodeId}
        group={node}
        onChange={onChange}
        onRemove={onRemove}
        depth={depth}
      />
    );
  }

  return (
    <RuleEditor
      nodeId={nodeId}
      rule={node}
      onChange={onChange}
      onRemove={onRemove}
      onWrapInGroup={() => {
        onChange({ type: "group", id: crypto.randomUUID(), logic: "and", children: [node] });
      }}
    />
  );
}

// ---- ConditionTreeEditor (公開 controlled component) ----

interface ConditionTreeEditorProps {
  nodeId: string;
  value: ConditionNode;
  onChange: (node: ConditionNode) => void;
  onRemove?: () => void;
}

export function ConditionTreeEditor({
  nodeId,
  value,
  onChange,
  onRemove,
}: ConditionTreeEditorProps) {
  return (
    <ConditionNodeEditor
      nodeId={nodeId}
      node={value}
      onChange={onChange}
      onRemove={onRemove}
      depth={0}
    />
  );
}
