import { RandomSelectStepSchema, type RandomSelectStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const RandomSelectDetailPanel = ({ step, onChange }: DetailPanelProps<RandomSelectStep>) => {
  const itemsCount = step.items.filter((item) => item.trim() !== "").length;

  return (
    <div className="flex flex-col gap-3">
      <label className="form-control w-full">
        <div className="label">
          <span className="label-text">フラグ名</span>
        </div>
        <input
          type="text"
          className="input input-bordered w-full"
          value={step.resultFlagKey}
          onChange={(evt) => onChange({ resultFlagKey: evt.target.value })}
          placeholder="例: 犯人"
        />
      </label>

      <div>
        <div className="label">
          <span className="label-text font-semibold">候補 ({itemsCount})</span>
        </div>
        {step.items.map((item, index) => (
          // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
          <div key={`item-${index}`} className="flex gap-2 items-center mb-2">
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              value={item}
              onChange={(evt) =>
                onChange({ items: step.items.map((v, i) => (i === index ? evt.target.value : v)) })
              }
              placeholder="候補名を入力"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange({ items: step.items.filter((_, i) => i !== index) })}
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-1"
          onClick={() => onChange({ items: [...step.items, ""] })}
        >
          候補を追加
        </button>
      </div>
    </div>
  );
};

export const RandomSelectEntry = defineStep<RandomSelectStep>({
  type: "RandomSelect",
  schema: RandomSelectStepSchema,
  category: "tool",
  defaults: () => ({
    type: "RandomSelect",
    title: "ランダム選択",
    memo: "",
    autoAdvance: false,
    // schema が items に非空要素を 1 つ以上、resultFlagKey に非空を要求するため初期値を入れる。
    items: ["候補1"],
    resultFlagKey: "result",
  }),
  summary: (step) => {
    const items = step.items.filter((item) => item.trim() !== "").length;
    const flag = step.resultFlagKey.trim();
    return items > 0 && flag !== ""
      ? `ランダム選択: ${items}候補 → ${flag}`
      : "ランダム選択 (未設定)";
  },
  DetailPanel: RandomSelectDetailPanel,
});
