import type { FlowData, Step } from "@/flow/schema";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { sectionBlockIds } from "./blockOps";

// 実行モードは flow 側の runnerStore・engine・実行 UI をそのまま使い、ブロック列を
// セクション 1 つの FlowData に包んで橋渡しする (docs: scenario-editor-architecture
// 「既存エンジンの再利用」)。実行意味論を新画面用に書き直すと実装が二重化するため、
// 包み方だけをここに閉じ込める。セクションはこの包みの中にしか存在せず、UI には出ない (D8)。

const SECTION_ID = "scenario";

export const toRunnerFlow = (blocks: Step[]): FlowData => ({
  version: 1,
  sections: [{ id: SECTION_ID, title: "", memo: "", collapsed: false, steps: blocks }],
});

export const runnerBlocks = (flowData: FlowData): Step[] => flowData.sections[0]?.steps ?? [];

// 見出しの「ここから再実行」(docs: scenario-editor-architecture D9)。見出しが束ねる範囲の
// 実行痕跡とスキップ印を消し、カーソルを見出しへ戻す。専用のループ型は持たず、周回数は
// 既存の Counter ステップで数える。
export const restartFromHeading = (headingId: string): void => {
  const { flowData, clearExecution, setCursor } = useRunnerStore.getState();
  clearExecution(sectionBlockIds(runnerBlocks(flowData), headingId));
  setCursor(headingId);
};
