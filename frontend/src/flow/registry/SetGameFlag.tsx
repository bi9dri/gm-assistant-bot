import { SetGameFlagStepSchema, type SetGameFlagStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const SetGameFlagDetailPanel = ({ step, onChange }: DetailPanelProps<SetGameFlagStep>) => (
  <div className="flex flex-col gap-3">
    <fieldset className="fieldset">
      <legend className="fieldset-legend">フラグ名</legend>
      <input
        type="text"
        className="input w-full"
        value={step.flagKey}
        onChange={(evt) => onChange({ flagKey: evt.target.value })}
        placeholder="例: アイテム入手, イベント発生済み"
      />
    </fieldset>
    <fieldset className="fieldset">
      <legend className="fieldset-legend">値</legend>
      <input
        type="text"
        className="input w-full"
        value={step.flagValue}
        onChange={(evt) => onChange({ flagValue: evt.target.value })}
        placeholder="例: 1, アイテム名"
      />
    </fieldset>
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
  execute: async (step, ctx) => {
    const key = step.flagKey.trim();
    if (key === "") return { status: "error", message: "フラグ名を入力してください" };

    const value = step.flagValue.trim();
    await ctx.flags.set({ [key]: value });
    return { status: "success", message: `フラグ「${key}」を設定しました` };
  },
});
