import { TextStepSchema, type TextStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const TextDetailPanel = ({ step, onChange }: DetailPanelProps<TextStep>) => (
  <fieldset className="fieldset">
    <legend className="fieldset-legend">本文</legend>
    <textarea
      className="textarea w-full"
      rows={8}
      value={step.body}
      placeholder="シナリオ本文"
      onChange={(event) => onChange({ body: event.target.value })}
    />
  </fieldset>
);

const SUMMARY_LENGTH = 40;

export const TextEntry = defineStep<TextStep>({
  type: "Text",
  schema: TextStepSchema,
  category: "text",
  defaults: () => ({
    type: "Text",
    title: "本文",
    memo: "",
    autoAdvance: false,
    body: "",
  }),
  summary: (step) => {
    const firstLine = step.body
      .split("\n")
      .find((line) => line.trim() !== "")
      ?.trim();
    if (firstLine === undefined) return "本文 (空)";
    // サロゲートペアを割らないようコードポイント単位で切る
    const chars = [...firstLine];
    return chars.length > SUMMARY_LENGTH
      ? `${chars.slice(0, SUMMARY_LENGTH).join("")}…`
      : firstLine;
  },
  DetailPanel: TextDetailPanel,
  // 実行は no-op。通過した記録 (executedAt) を打つためだけに execute を持つ
  // (docs: scenario-editor-architecture D10)。
  execute: () => Promise.resolve({ status: "success", message: "" }),
});
