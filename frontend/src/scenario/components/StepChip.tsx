import clsx from "clsx";

import { StepRowContent } from "@/flow/components/StepList";
import type { Step } from "@/flow/schema";

// 文中の操作 1 つ分の見た目 (docs: scenario-editor-architecture D7 / D24)。
// 1 行サマリだけを出し、編集は右カラムの DetailPanel に任せる。行内にフォームを
// 押し込むと、React Flow を離れる原因になったコンテンツのはみ出しが再発する。

interface ChipShellProps {
  step: Step;
  selected: boolean;
  onSelect: () => void;
  // マーカー・実行ボタンなど、モードごとの付属物。
  children?: React.ReactNode;
}

export const StepChip = ({ step, selected, onSelect, children }: ChipShellProps) => (
  <span
    // 目次・カーソル追従のアンカー。
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

// 実体を失った参照。保存時に落ちるのは doc から参照されなくなった実体のほうなので、
// この向きの食い違いは自動では直らない。無言で消さずに本文上で見せる。
export const MissingStepChip = () => (
  <span className="mx-0.5 rounded border border-error px-1.5 py-0.5 text-xs text-error">
    (削除された操作)
  </span>
);
