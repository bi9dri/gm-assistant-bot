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

// ドキュメント本文としてのインライン編集 (docs: scenario-editor-architecture D7)。
// 高さは CSS の field-sizing に任せる (JS でのオートリサイズを持たない)。
const TextInlineBody = ({ step, onChange }: DetailPanelProps<TextStep>) => (
  <textarea
    className="textarea field-sizing-content min-h-16 w-full border-transparent bg-transparent px-0 text-base leading-relaxed focus:border-base-300"
    value={step.body}
    placeholder="シナリオ本文"
    aria-label="シナリオ本文"
    onChange={(event) => onChange({ body: event.target.value })}
  />
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
  InlineBody: TextInlineBody,
  // 実行は no-op。通過した記録 (executedAt) を打つためだけに execute を持つ
  // (docs: scenario-editor-architecture D10)。
  execute: () => Promise.resolve({ status: "success", message: "" }),
});
