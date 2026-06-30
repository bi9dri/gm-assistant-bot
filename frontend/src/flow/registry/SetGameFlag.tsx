import { SetGameFlagStepSchema, type SetGameFlagStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const SetGameFlagDetailPanel = ({ step, onChange }: DetailPanelProps<SetGameFlagStep>) => (
  <div className="flex flex-col gap-3">
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text">フラグ名</span>
      </div>
      <input
        type="text"
        className="input input-bordered w-full"
        value={step.flagKey}
        onChange={(evt) => onChange({ flagKey: evt.target.value })}
        placeholder="例: アイテム入手, イベント発生済み"
      />
    </label>
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text">値</span>
      </div>
      <input
        type="text"
        className="input input-bordered w-full"
        value={step.flagValue}
        onChange={(evt) => onChange({ flagValue: evt.target.value })}
        placeholder="例: 1, アイテム名"
      />
    </label>
  </div>
);

export const SetGameFlagEntry = defineStep<SetGameFlagStep>({
  type: "SetGameFlag",
  schema: SetGameFlagStepSchema,
  category: "action",
  defaults: () => ({
    type: "SetGameFlag",
    title: "ゲームフラグを設定する",
    memo: "",
    autoAdvance: false,
    flagKey: "",
    flagValue: "",
  }),
  summary: (step) =>
    step.flagKey.trim() !== ""
      ? `フラグ設定: ${step.flagKey} = ${step.flagValue.trim() !== "" ? step.flagValue : "(空)"}`
      : "フラグ設定 (未設定)",
  DetailPanel: SetGameFlagDetailPanel,
});
