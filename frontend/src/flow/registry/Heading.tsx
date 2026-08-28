import { HeadingStepSchema, type HeadingStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const LEVELS = [1, 2, 3] as const;

const HeadingDetailPanel = ({ step, onChange }: DetailPanelProps<HeadingStep>) => (
  <fieldset className="fieldset">
    <legend className="fieldset-legend">見出しレベル</legend>
    <select
      className="select w-full"
      value={step.level}
      onChange={(event) => onChange({ level: Number(event.target.value) })}
    >
      {LEVELS.map((level) => (
        <option key={level} value={level}>
          H{level}
        </option>
      ))}
    </select>
  </fieldset>
);

const HEADING_CLASS: Record<number, string> = {
  1: "text-2xl font-bold",
  2: "text-xl font-bold",
  3: "text-lg font-semibold",
};

// 見出しの本体は共通フィールドの title。インラインではそれを直接書き換える (docs: scenario-editor-architecture D7)。
const HeadingInlineBody = ({ step, onChange }: DetailPanelProps<HeadingStep>) => (
  <input
    className={`input w-full border-transparent bg-transparent px-0 focus:border-base-300 ${HEADING_CLASS[step.level] ?? ""}`}
    value={step.title}
    placeholder="見出し"
    aria-label={`見出し (H${step.level})`}
    onChange={(event) => onChange({ title: event.target.value })}
  />
);

export const HeadingEntry = defineStep<HeadingStep>({
  type: "Heading",
  schema: HeadingStepSchema,
  category: "text",
  defaults: () => ({
    type: "Heading",
    title: "見出し",
    memo: "",
    autoAdvance: false,
    level: 1,
    collapsed: false,
  }),
  summary: (step) => {
    const title = step.title.trim();
    return `H${step.level} ${title === "" ? "(無題)" : title}`;
  },
  DetailPanel: HeadingDetailPanel,
  InlineBody: HeadingInlineBody,
});
