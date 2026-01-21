import { useMemo } from "react";
import { LuPencil, LuChevronDown } from "react-icons/lu";

import { PortaledSelect } from "./PortaledSelect";
import { useTemplateResources } from "./useTemplateResources";

interface ResourceSelectorProps {
  nodeId: string;
  resourceType: "role" | "channel" | "gameFlag";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  channelTypeFilter?: "text" | "voice";
  className?: string;
}

export function ResourceSelector({
  nodeId,
  resourceType,
  value,
  onChange,
  placeholder,
  disabled,
  allowCustom = true,
  channelTypeFilter,
  className,
}: ResourceSelectorProps) {
  const resources = useTemplateResources(nodeId);

  const options = useMemo(() => {
    let items: Array<{ name: string; sourceNodeId: string }> = [];

    switch (resourceType) {
      case "role":
        items = resources.roles;
        break;
      case "channel":
        items = channelTypeFilter
          ? resources.channels.filter((c) => c.type === channelTypeFilter)
          : resources.channels;
        break;
      case "gameFlag":
        items = resources.gameFlags.map((f) => ({ name: f.key, sourceNodeId: f.sourceNodeId }));
        break;
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const unique: typeof items = [];
    for (const item of items) {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        unique.push(item);
      }
    }

    return unique.map((item) => ({
      id: item.name,
      label: item.name,
    }));
  }, [resources, resourceType, channelTypeFilter]);

  const hasOptions = options.length > 0;

  // If no options available, always show text input
  if (!hasOptions) {
    return (
      <input
        type="text"
        className={`nodrag input input-bordered input-sm w-full ${className ?? ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  }

  // Check if current value is in the options list
  const isValueInOptions = options.some((opt) => opt.id === value);

  // If value is not in options and allowCustom, show text input with switch button
  if (!isValueInOptions && value !== "" && allowCustom) {
    return (
      <div className="flex gap-1 items-center w-full">
        <input
          type="text"
          className={`nodrag input input-bordered input-sm flex-1 ${className ?? ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="button"
          className="nodrag btn btn-ghost btn-sm btn-square"
          onClick={() => onChange("")}
          title="リストから選択"
          disabled={disabled}
        >
          <LuChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Show dropdown with options
  return (
    <div className="flex gap-1 items-center w-full">
      <div className="flex-1">
        <PortaledSelect
          options={options}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${className ?? ""}`}
        />
      </div>
      {allowCustom && (
        <button
          type="button"
          className="nodrag btn btn-ghost btn-sm btn-square"
          onClick={() => onChange(value || "")}
          title="カスタム入力"
          disabled={disabled}
        >
          <LuPencil className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
