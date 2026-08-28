import z from "zod";

import { StepSchema } from "@/flow/schema";

// シナリオドキュメント型 UI (issue #213 / #245) のデータモデル。
// ブロックは既存の Step をそのまま使い、トップレベルはフラットな列にする。
// ネストは Branch のアーム (branches[].steps) のみ (docs: scenario-editor-architecture D6 / D8)。

// z.lazy 経由で参照する。flow/schema は messageSchema → fileSystem → db/models 経由で
// このモジュールに戻る循環の中にあり、トップレベルで StepSchema を触ると
// 初期化順によっては undefined になる。
export const ScenarioDataSchema = z.object({
  version: z.literal(1),
  blocks: z.array(z.lazy(() => StepSchema)),
});

export type ScenarioData = z.infer<typeof ScenarioDataSchema>;

// 新規作成時の初期値、およびパース失敗時のフォールバック。
export const defaultScenarioData: ScenarioData = { version: 1, blocks: [] };

// 一覧のバッジ・導線の判定 (docs: scenario-editor-architecture D12)。
// Dexie v9 が全既存レコードに空の scenarioData を backfill しているため、
// 「フィールドの有無」ではなくブロックが 1 つ以上あるかで判定する。
export const hasScenarioBlocks = (scenarioData: string): boolean => {
  try {
    // 一覧のカードごとに走るため、全ブロックの zod 検証はしない。中身の妥当性は
    // 画面を開いた時点で getParsedScenarioData が担保する。
    const parsed: unknown = JSON.parse(scenarioData);
    const blocks = (parsed as { blocks?: unknown }).blocks;
    return Array.isArray(blocks) && blocks.length > 0;
  } catch {
    return false;
  }
};
