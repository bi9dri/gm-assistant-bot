import type { JSONContent } from "@tiptap/core";

import { runnableStepsIn } from "@/flow/engine/order";
import type { FlowData, Step } from "@/flow/schema";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { withDescendantIds } from "./document";
import { sectionStepIds } from "./outline";

// 実行モードは flow 側の runnerStore・engine・実行 UI をそのまま使い、ステップ列を
// セクション 1 つの FlowData に包んで橋渡しする (docs: scenario-editor-architecture
// 「既存エンジンの再利用」)。実行意味論を新画面用に書き直すと実装が二重化するため、
// 包み方だけをここに閉じ込める。セクションはこの包みの中にしか存在せず、UI には出ない (D8)。

const SECTION_ID = "scenario";

export const toRunnerFlow = (steps: Step[]): FlowData => ({
  version: 1,
  sections: [{ id: SECTION_ID, title: "", memo: "", collapsed: false, steps }],
});

export const runnerSteps = (flowData: FlowData): Step[] => flowData.sections[0]?.steps ?? [];

// セッションを開き直したときのカーソル位置。executedAt はセッションに永続化されるので、
// 先頭ではなく最初の未実行ステップに置いて進行中の位置に戻す。
export const resumeCursorId = (steps: Step[]): string | null =>
  runnableStepsIn(steps).find((step) => step.executedAt === undefined)?.id ?? null;

// 見出しの「ここから再実行」(docs: scenario-editor-architecture D9)。見出しが束ねる範囲の
// 実行痕跡とスキップ印を消し、カーソルをその範囲の先頭へ戻す。専用のループ型は持たず、
// 周回数は既存の Counter ステップで数える。
export const restartFromHeading = (doc: JSONContent, headingIndex: number): void => {
  const { flowData, clearExecution, setCursor } = useRunnerStore.getState();
  const ids = sectionStepIds(doc, headingIndex);
  clearExecution(withDescendantIds(ids, runnerSteps(flowData)));
  setCursor(ids[0] ?? null);
};
