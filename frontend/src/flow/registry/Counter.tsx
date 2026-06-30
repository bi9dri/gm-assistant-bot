import { CounterStepSchema, type CounterStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const CounterDetailPanel = ({ step, onChange }: DetailPanelProps<CounterStep>) => (
  <div className="flex flex-col gap-2">
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text">フラグ名</span>
      </div>
      <input
        type="text"
        className="input input-bordered w-full"
        value={step.flagKey}
        onChange={(evt) => onChange({ flagKey: evt.target.value })}
        placeholder="例: ラウンド数, ライフ"
      />
    </label>
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text">増減量</span>
      </div>
      <input
        type="number"
        className="input input-bordered w-full"
        value={step.step}
        min={1}
        onChange={(evt) => {
          const next = Number(evt.target.value);
          if (next >= 1) onChange({ step: next });
        }}
      />
    </label>
  </div>
);

export const CounterEntry = defineStep<CounterStep>({
  type: "Counter",
  schema: CounterStepSchema,
  category: "tool",
  defaults: () => ({
    type: "Counter",
    title: "カウンター",
    memo: "",
    autoAdvance: false,
    flagKey: "",
    step: 1,
  }),
  summary: (step) =>
    step.flagKey.trim() !== ""
      ? `カウンター: ${step.flagKey} (+${step.step})`
      : "カウンター (未設定)",
  DetailPanel: CounterDetailPanel,
});
