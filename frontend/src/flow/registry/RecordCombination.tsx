import { generateId } from "../ids";
import { RecordCombinationStepSchema, type RecordCombinationStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

type OptionItem = RecordCombinationStep["sourceOptions"]["items"][number];
type CombinationConfig = RecordCombinationStep["config"];

interface OptionListEditorProps {
  label: string;
  items: OptionItem[];
  onItemsChange: (items: OptionItem[]) => void;
}

const OptionListEditor = ({ label, items, onItemsChange }: OptionListEditorProps) => {
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
            className="input input-bordered input-sm flex-1"
            value={item.label}
            onChange={(e) => handleLabelChange(index, e.target.value)}
            placeholder={`${label}名を入力`}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => handleRemove(index)}
            title="削除"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleAdd}>
        + {label}を追加
      </button>
    </div>
  );
};

const RecordCombinationDetailPanel = ({
  step,
  onChange,
}: DetailPanelProps<RecordCombinationStep>) => {
  const { config, sourceOptions, targetOptions } = step;

  const handleConfigChange = (patch: Partial<CombinationConfig>) => {
    onChange({ config: { ...config, ...patch } });
  };

  const handleSourceItemsChange = (items: OptionItem[]) => {
    onChange({ sourceOptions: { ...sourceOptions, items } });
  };

  const handleTargetItemsChange = (items: OptionItem[]) => {
    onChange({ targetOptions: { label: targetOptions?.label ?? "選択肢B", items } });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-base-200 rounded-box p-3 space-y-2">
        <div className="text-sm font-medium">設定</div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-2 py-1">
            <input
              type="radio"
              name={`mode-${step.id}`}
              className="radio radio-sm"
              checked={config.mode === "same-set"}
              onChange={() => handleConfigChange({ mode: "same-set" })}
            />
            <span className="label-text text-xs">同一集合（A−A）</span>
          </label>
          <label className="label cursor-pointer justify-start gap-2 py-1">
            <input
              type="radio"
              name={`mode-${step.id}`}
              className="radio radio-sm"
              checked={config.mode === "different-set"}
              onChange={() => handleConfigChange({ mode: "different-set" })}
            />
            <span className="label-text text-xs">異なる集合（A→B）</span>
          </label>
        </div>

        <div className="divider my-1" />

        <div className="flex flex-col gap-1">
          <label className="label cursor-pointer justify-start gap-2 py-1">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={config.allowDuplicates}
              onChange={(e) => handleConfigChange({ allowDuplicates: e.target.checked })}
            />
            <span className="label-text text-xs">重複ペアを許可</span>
          </label>

          {config.mode === "same-set" && (
            <label className="label cursor-pointer justify-start gap-2 py-1">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={config.distinguishOrder}
                onChange={(e) => handleConfigChange({ distinguishOrder: e.target.checked })}
              />
              <span className="label-text text-xs">順序を区別する（A→B ≠ B→A）</span>
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <OptionListEditor
          label={sourceOptions.label}
          items={sourceOptions.items}
          onItemsChange={handleSourceItemsChange}
        />

        {config.mode === "different-set" && (
          <>
            <div className="divider my-0" />
            <OptionListEditor
              label={targetOptions?.label ?? "選択肢B"}
              items={targetOptions?.items ?? []}
              onItemsChange={handleTargetItemsChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export const RecordCombinationEntry = defineStep<RecordCombinationStep>({
  type: "RecordCombination",
  schema: RecordCombinationStepSchema,
  category: "tool",
  defaults: () => ({
    type: "RecordCombination",
    title: "組み合わせを記録",
    memo: "",
    autoAdvance: false,
    config: {
      mode: "same-set",
      allowSelfPairing: false,
      allowDuplicates: false,
      distinguishOrder: true,
      allowMultipleAssignments: false,
    },
    sourceOptions: { label: "選択肢A", items: [] },
    recordedPairs: [],
  }),
  summary: (step) => {
    const sourceCount = step.sourceOptions.items.length;
    const targetCount = step.targetOptions?.items.length ?? 0;
    if (sourceCount === 0 && targetCount === 0) return "組み合わせ記録 (未設定)";
    return step.config.mode === "different-set"
      ? `組み合わせ記録: ${sourceCount}件×${targetCount}件`
      : `組み合わせ記録: ${sourceCount}件`;
  },
  DetailPanel: RecordCombinationDetailPanel,
});
