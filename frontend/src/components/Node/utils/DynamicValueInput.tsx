import type { DynamicValue } from "./DynamicValue";

import { useNodeExecutionOptional } from "../contexts";
import { ResourceSelector } from "./ResourceSelector";

type SupportedType = "literal" | "session.name" | "roleRef" | "channelRef" | "gameFlag";

interface DynamicValueInputProps {
  nodeId: string;
  value: DynamicValue;
  onChange: (value: DynamicValue) => void;
  placeholder?: string;
  disabled?: boolean;
  supportedTypes?: SupportedType[];
  channelTypeFilter?: "text" | "voice";
}

const TYPE_LABELS: Record<SupportedType, string> = {
  literal: "固定値",
  "session.name": "セッション名",
  roleRef: "ロール参照",
  channelRef: "チャンネル参照",
  gameFlag: "ゲームフラグ",
};

export const DynamicValueInput = ({
  nodeId,
  value,
  onChange,
  placeholder,
  disabled,
  supportedTypes = ["literal", "session.name"],
  channelTypeFilter,
}: DynamicValueInputProps) => {
  const executionContext = useNodeExecutionOptional();

  const handleTypeChange = (newType: SupportedType) => {
    switch (newType) {
      case "literal":
        onChange({ type: "literal", value: "" });
        break;
      case "session.name":
        onChange({ type: "session.name" });
        break;
      case "roleRef":
        onChange({ type: "roleRef", roleName: "" });
        break;
      case "channelRef":
        onChange({ type: "channelRef", channelName: "" });
        break;
      case "gameFlag":
        onChange({ type: "gameFlag", flagKey: "" });
        break;
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap gap-2">
        {supportedTypes.map((type) => (
          <label key={type} className="label cursor-pointer gap-1 p-0">
            <input
              type="radio"
              name={`value-type-${nodeId}`}
              className="nodrag radio radio-xs"
              checked={value.type === type}
              onChange={() => handleTypeChange(type)}
              disabled={disabled}
            />
            <span className="label-text text-xs">{TYPE_LABELS[type]}</span>
          </label>
        ))}
      </div>

      {value.type === "literal" && (
        <input
          type="text"
          className="nodrag input input-bordered input-sm w-full"
          value={value.value}
          onChange={(e) => onChange({ type: "literal", value: e.target.value })}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}

      {value.type === "session.name" && executionContext && (
        <span className="text-sm text-base-content/70 truncate">
          → {executionContext.sessionName}
        </span>
      )}

      {value.type === "roleRef" && (
        <ResourceSelector
          nodeId={nodeId}
          resourceType="role"
          value={value.roleName}
          onChange={(name) => onChange({ type: "roleRef", roleName: name })}
          placeholder="ロール名を選択"
          disabled={disabled}
        />
      )}

      {value.type === "channelRef" && (
        <ResourceSelector
          nodeId={nodeId}
          resourceType="channel"
          value={value.channelName}
          onChange={(name) => onChange({ type: "channelRef", channelName: name })}
          placeholder="チャンネル名を選択"
          disabled={disabled}
          channelTypeFilter={channelTypeFilter}
        />
      )}

      {value.type === "gameFlag" && (
        <ResourceSelector
          nodeId={nodeId}
          resourceType="gameFlag"
          value={value.flagKey}
          onChange={(key) => onChange({ type: "gameFlag", flagKey: key })}
          placeholder="フラグキーを選択"
          disabled={disabled}
        />
      )}
    </div>
  );
};
