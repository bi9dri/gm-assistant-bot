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
  summary: (step) => `H${step.level} ${step.title.trim() === "" ? "(無題)" : step.title.trim()}`,
  DetailPanel: HeadingDetailPanel,
});
