import { ShuffleAssignStepSchema, type ShuffleAssignStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const ShuffleAssignDetailPanel = ({ step, onChange }: DetailPanelProps<ShuffleAssignStep>) => {
  const itemsCount = step.items.filter((item) => item.trim() !== "").length;
  const targetsCount = step.targets.filter((target) => target.trim() !== "").length;

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">フラグのプレフィックス</legend>
        <input
          type="text"
          className="input w-full"
          value={step.resultFlagPrefix}
          onChange={(evt) => onChange({ resultFlagPrefix: evt.target.value })}
          placeholder="例: 没情報"
        />
      </fieldset>

      <div>
        <div className="label">
          <span className="label-text font-semibold">配布項目 ({itemsCount})</span>
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
              placeholder="項目名を入力"
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
          項目を追加
        </button>
      </div>

      <div>
        <div className="label">
          <span className="label-text font-semibold">割り当て対象 ({targetsCount})</span>
        </div>
        {step.targets.map((target, index) => (
          // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
          <div key={`target-${index}`} className="flex gap-2 items-center mb-2">
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              value={target}
              onChange={(evt) =>
                onChange({
                  targets: step.targets.map((v, i) => (i === index ? evt.target.value : v)),
                })
              }
              placeholder="対象名を入力"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange({ targets: step.targets.filter((_, i) => i !== index) })}
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-1"
          onClick={() => onChange({ targets: [...step.targets, ""] })}
        >
          対象を追加
        </button>
      </div>

      {itemsCount !== targetsCount && (
        <div className="alert alert-info text-sm">
          <span>
            {itemsCount > targetsCount
              ? "項目が多いため、一部の対象に複数の項目が割り当てられます"
              : "項目が少ないため、一部の対象には何も割り当てられません"}
          </span>
        </div>
      )}
    </div>
  );
};

export const ShuffleAssignEntry = defineStep<ShuffleAssignStep>({
  type: "ShuffleAssign",
  schema: ShuffleAssignStepSchema,
  category: "tool",
  defaults: () => ({
    type: "ShuffleAssign",
    title: "シャッフル割り当て",
    memo: "",
    autoAdvance: false,
    // schema が items/targets に非空要素を 1 つ以上要求するため placeholder を入れる。
    items: ["アイテム1"],
    targets: ["対象1"],
    resultFlagPrefix: "result",
  }),
  summary: (step) => {
    const items = step.items.filter((item) => item.trim() !== "").length;
    const targets = step.targets.filter((target) => target.trim() !== "").length;
    return items > 0 && targets > 0
      ? `シャッフル割り当て: ${items}項目 → ${targets}対象`
      : "シャッフル割り当て (未設定)";
  },
  DetailPanel: ShuffleAssignDetailPanel,
});
