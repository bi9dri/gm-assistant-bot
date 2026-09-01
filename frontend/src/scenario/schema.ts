import type { JSONContent } from "@tiptap/core";
import z from "zod";

import { StepSchema } from "@/flow/schema";

// シナリオドキュメント型 UI (issue #213 / #245) のデータモデル。
// 本文は ProseMirror ドキュメント 1 本、Discord 操作は文中から stepId で参照される
// 実体の配列として分けて持つ (docs: scenario-editor-architecture D8 / D25)。

// 文中の操作を表すノード名。doc の走査 (document.ts) と Tiptap の拡張定義 (editor/) が共有する。
export const STEP_NODE_NAME = "step";
export const BRANCH_NODE_NAME = "branch";

// z.lazy 経由で参照する。flow/schema は messageSchema → fileSystem → db/models 経由で
// このモジュールに戻る循環の中にあり、トップレベルで StepSchema を触ると
// 初期化順によっては undefined になる。
export const ScenarioDataSchema = z.object({
  version: z.literal(2),
  // ProseMirror の JSON。許可ノードのホワイトリストは Tiptap の schema が持つため
  // (docs: scenario-editor-architecture D23)、ここで構造を二重に定義しない。ただし doc
  // ノードであることは見る。ここを通すと Node.fromJSON が描画中に throw し、空へ落ちる
  // フォールバックではなく画面のクラッシュになる。
  doc: z.custom<JSONContent>((value) => (value as JSONContent | null)?.type === "doc"),
  steps: z.array(z.lazy(() => StepSchema)),
});

export type ScenarioData = z.infer<typeof ScenarioDataSchema>;

// ProseMirror は空のドキュメントを許さない (doc の content が 1 ノード以上必要)。
export const emptyDoc = (): JSONContent => ({ type: "doc", content: [{ type: "paragraph" }] });

// 新規作成時の初期値、およびパース失敗時のフォールバック。
export const defaultScenarioData: ScenarioData = { version: 2, doc: emptyDoc(), steps: [] };

const hasVisibleContent = (node: JSONContent): boolean => {
  if (node.type === STEP_NODE_NAME || node.type === BRANCH_NODE_NAME) return true;
  if (typeof node.text === "string" && node.text.trim() !== "") return true;
  return (node.content ?? []).some(hasVisibleContent);
};

// 一覧のバッジ・導線の判定 (docs: scenario-editor-architecture D12)。
// Dexie v9 が全既存レコードに空の scenarioData を backfill しているため、
// 「フィールドの有無」ではなく中身が書かれているかで判定する。
export const hasScenarioContent = (scenarioData: string): boolean => {
  try {
    // 一覧のカードごとに走るため、全ステップの zod 検証はしない。中身の妥当性は
    // 画面を開いた時点で getParsedScenarioData が担保する。
    const parsed: unknown = JSON.parse(scenarioData);
    const { doc, steps } = parsed as { doc?: JSONContent; steps?: unknown };
    if (Array.isArray(steps) && steps.length > 0) return true;
    return doc !== undefined && hasVisibleContent(doc);
  } catch {
    return false;
  }
};
