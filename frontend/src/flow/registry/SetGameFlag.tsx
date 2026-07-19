import { useMemo } from "react";

import { useTemplateResources } from "@/components/Node/utils/useTemplateResources";

import { DatalistInput } from "../components/DatalistInput";
import { collectFlagKeyOptions, collectFlagValueOptions } from "../resources";
import { SetGameFlagStepSchema, type SetGameFlagStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const SetGameFlagDetailPanel = ({ step, onChange }: DetailPanelProps<SetGameFlagStep>) => {
  const resources = useTemplateResources(step.id);
  const keyOptions = useMemo(() => collectFlagKeyOptions(resources), [resources]);
  const valueOptions = useMemo(
    () => collectFlagValueOptions(resources, step.flagKey),
    [resources, step.flagKey],
  );

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">フラグ名</legend>
        <DatalistInput
          value={step.flagKey}
          onChange={(flagKey) => onChange({ flagKey })}
          options={keyOptions}
          placeholder="例: アイテム入手, イベント発生済み"
        />
      </fieldset>
      <fieldset className="fieldset">
        <legend className="fieldset-legend">値</legend>
        <DatalistInput
          value={step.flagValue}
          onChange={(flagValue) => onChange({ flagValue })}
          options={valueOptions}
          placeholder="例: 1, アイテム名"
        />
      </fieldset>
    </div>
  );
};

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
