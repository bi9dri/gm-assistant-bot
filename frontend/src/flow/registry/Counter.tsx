import { CounterStepSchema, type CounterStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const CounterDetailPanel = ({ step, onChange }: DetailPanelProps<CounterStep>) => (
  <div className="flex flex-col gap-2">
    <fieldset className="fieldset">
      <legend className="fieldset-legend">フラグ名</legend>
      <input
        type="text"
        className="input w-full"
        value={step.flagKey}
        onChange={(evt) => onChange({ flagKey: evt.target.value })}
        placeholder="例: ラウンド数, ライフ"
      />
    </fieldset>
    <fieldset className="fieldset">
      <legend className="fieldset-legend">増減量</legend>
      <input
        type="number"
        className="input w-full"
        value={step.step}
        min={1}
        onChange={(evt) => {
          const next = Number(evt.target.value);
          if (next >= 1) onChange({ step: next });
        }}
      />
    </fieldset>
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
