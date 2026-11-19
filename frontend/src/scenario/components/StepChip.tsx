import clsx from "clsx";

import { StepRowContent } from "@/flow/components/StepList";
import type { Step } from "@/flow/schema";

interface ChipShellProps {
  step: Step;
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}

export const StepChip = ({ step, selected, onSelect, children }: ChipShellProps) => (
  <span
    id={`step-${step.id}`}
    contentEditable={false}
    className={clsx(
      "mx-0.5 inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 align-middle text-sm",
      selected ? "border-primary bg-primary/10" : "border-base-300 bg-base-200",
    )}
  >
    <button type="button" className="flex min-w-0 items-center gap-1" onClick={onSelect}>
      <StepRowContent step={step} />
    </button>
    {children}
  </span>
);

export const MissingStepChip = () => (
  <span className="mx-0.5 rounded border border-error px-1.5 py-0.5 text-xs text-error">
    (削除された操作)
  </span>
);
