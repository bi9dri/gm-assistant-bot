import { useMemo } from "react";

import { PortaledSelect } from "./PortaledSelect";
import { useTemplateResources } from "./useTemplateResources";

interface FlagValueSelectorProps {
  nodeId: string;
  flagKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function FlagValueSelector({
  nodeId,
  flagKey,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: FlagValueSelectorProps) {
  const resources = useTemplateResources(nodeId);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const flag of resources.gameFlags) {
      if (flag.key !== flagKey) continue;
      for (const v of flag.values) {
        if (v.trim() && !seen.has(v.trim())) {
          seen.add(v.trim());
          unique.push(v.trim());
        }
      }
    }

    return unique.map((v) => ({ id: v, label: v }));
  }, [resources.gameFlags, flagKey]);

  const hasOptions = options.length > 0;

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

  return (
    <PortaledSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full ${className ?? ""}`}
    />
  );
}
