import type { DynamicValue } from "./DynamicValue";

import { useNodeExecutionOptional } from "../contexts";

interface DynamicValueInputProps {
  value: DynamicValue;
  onChange: (value: DynamicValue) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const DynamicValueInput = ({
  value,
  onChange,
  placeholder,
  disabled,
}: DynamicValueInputProps) => {
  const executionContext = useNodeExecutionOptional();

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <label className="label cursor-pointer gap-1 p-0">
          <input
            type="radio"
            name="value-type"
            className="nodrag radio radio-xs"
            checked={value.type === "literal"}
            onChange={() => onChange({ type: "literal", value: "" })}
            disabled={disabled}
          />
          <span className="label-text text-xs">固定値</span>
        </label>
        <label className="label cursor-pointer gap-1 p-0">
          <input
            type="radio"
            name="value-type"
            className="nodrag radio radio-xs"
            checked={value.type === "session.name"}
            onChange={() => onChange({ type: "session.name" })}
            disabled={disabled}
          />
          <span className="label-text text-xs">セッション名</span>
        </label>
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
    </div>
  );
};
