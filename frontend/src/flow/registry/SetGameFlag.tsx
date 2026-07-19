import { useMemo } from "react";

import { useTemplateResources } from "@/components/Node/utils/useTemplateResources";

import { DatalistInput } from "../components/DatalistInput";
import { collectFlagKeyOptions, collectFlagValueOptions } from "../resources";
import { SetGameFlagStepSchema, type SetGameFlagStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const ChoiceSelect = ({
  value,
  choices,
  onChange,
}: {
  value: string;
  choices: string[];
  onChange: (value: string) => void;
}) => (
  <select
    className="select w-full"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    {!choices.includes(value) && (
      <option value={value}>{value === "" ? "選択してください" : value}</option>
    )}
    {choices.map((choice) => (
      <option key={choice} value={choice}>
        {choice}
      </option>
    ))}
  </select>
);

const OptionListEditor = ({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) => (
  <div className="flex flex-col gap-2">
    {options.map((option, index) => (
      // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
      <div key={index} className="flex items-center gap-2">
        <input
          type="text"
          className="input input-sm w-full"
          value={option}
          onChange={(event) =>
            onChange(options.map((v, i) => (i === index ? event.target.value : v)))
          }
          placeholder="候補を入力"
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(options.filter((_, i) => i !== index))}
        >
          削除
        </button>
      </div>
    ))}
    <button
      type="button"
      className="btn btn-ghost btn-sm self-start"
      onClick={() => onChange([...options, ""])}
    >
      選択肢を追加
    </button>
  </div>
);

const SetGameFlagDetailPanel = ({ step, onChange, mode }: DetailPanelProps<SetGameFlagStep>) => {
  const resources = useTemplateResources(step.id);
  const keyOptions = useMemo(() => collectFlagKeyOptions(resources), [resources]);
  const valueOptions = useMemo(
    () => collectFlagValueOptions(resources, step.flagKey),
    [resources, step.flagKey],
  );
  const isExecute = mode === "execute";
  const keyChoices = step.flagKeyOptions.filter((option) => option.trim() !== "");
  const valueChoices = step.flagValueOptions.filter((option) => option.trim() !== "");

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">フラグ名</legend>
        {isExecute && keyChoices.length > 0 ? (
          <ChoiceSelect
            value={step.flagKey}
            choices={keyChoices}
            onChange={(flagKey) => onChange({ flagKey })}
          />
        ) : (
          <DatalistInput
            value={step.flagKey}
            onChange={(flagKey) => onChange({ flagKey })}
            options={keyOptions}
            placeholder="例: アイテム入手, イベント発生済み"
          />
        )}
        {!isExecute && (
          <>
            <div className="label">
              <span className="label-text text-xs">実行時の選択肢 (空なら自由入力)</span>
            </div>
            <OptionListEditor
              options={step.flagKeyOptions}
              onChange={(flagKeyOptions) => onChange({ flagKeyOptions })}
            />
          </>
        )}
      </fieldset>
      <fieldset className="fieldset">
        <legend className="fieldset-legend">値</legend>
        {isExecute && valueChoices.length > 0 ? (
          <ChoiceSelect
            value={step.flagValue}
            choices={valueChoices}
            onChange={(flagValue) => onChange({ flagValue })}
          />
        ) : (
          <DatalistInput
            value={step.flagValue}
            onChange={(flagValue) => onChange({ flagValue })}
            options={valueOptions}
            placeholder="例: 1, アイテム名"
          />
        )}
        {!isExecute && (
          <>
            <div className="label">
              <span className="label-text text-xs">実行時の選択肢 (空なら自由入力)</span>
            </div>
            <OptionListEditor
              options={step.flagValueOptions}
              onChange={(flagValueOptions) => onChange({ flagValueOptions })}
            />
          </>
        )}
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
    flagKeyOptions: [],
    flagValueOptions: [],
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
