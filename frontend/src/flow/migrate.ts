import type { Transaction } from "dexie";

import type { FlowData, Step } from "./schema";

import { convertReactFlowToFlowData } from "./convert";
import { FlowDataSchema, defaultFlowData } from "./schema";

// reactFlowData → flowData の Dexie マイグレーション (issue #182 Phase 1)。
// 変換そのものは convert.ts、ここは「レコード 1 件をどう flowData 文字列にするか」と
// 「Dexie トランザクションで両テーブルを書き換える」までを担う純粋ロジック。
// database.ts の version(7).upgrade はこのモジュールを呼ぶだけの薄いラッパー。

type ConversionWarning = ReturnType<typeof convertReactFlowToFlowData>["warnings"][number];

const WARNING_PREFIX = "⚠️";

const appendMemo = (memo: string, text: string) => (memo === "" ? text : `${memo}\n\n${text}`);

// branches[].steps を含めて全ステップを id で引けるよう再帰的に索引する
function indexStepsById(flowData: FlowData): Map<string, Step> {
  const byId = new Map<string, Step>();
  const visit = (step: Step) => {
    byId.set(step.id, step);
    if (step.type !== "Branch") return;
    for (const arm of step.branches) for (const child of arm.steps) visit(child);
  };
  for (const section of flowData.sections) for (const step of section.steps) visit(step);
  return byId;
}

// converter の warnings を FlowData 内のメモへ畳み込み、UI 未整備の段階でも喪失させない。
// nodeId がステップに一致する警告はそのステップ memo へ、残り (グローバル警告・未実体化
// グループ等) は先頭セクション memo へ集約する。セクションが無ければ受け皿を 1 つ作る。
export function foldWarningsIntoFlowData(
  flowData: FlowData,
  warnings: ConversionWarning[],
): FlowData {
  if (warnings.length === 0) return flowData;

  const next = structuredClone(flowData);
  const stepsById = indexStepsById(next);
  const leftover: string[] = [];

  for (const warning of warnings) {
    const step = warning.nodeId === undefined ? undefined : stepsById.get(warning.nodeId);
    if (step) {
      step.memo = appendMemo(step.memo, `${WARNING_PREFIX} ${warning.message}`);
    } else {
      leftover.push(warning.message);
    }
  }

  if (leftover.length > 0) {
    const block = `${WARNING_PREFIX} 変換時の警告:\n${leftover.map((m) => `- ${m}`).join("\n")}`;
    if (next.sections.length === 0) {
      next.sections.push({
        id: "conversion-warnings",
        title: "変換時の警告",
        memo: block,
        collapsed: false,
        steps: [],
      });
    } else {
      next.sections[0].memo = appendMemo(next.sections[0].memo, block);
    }
  }

  return next;
}

// レコード 1 件に保存する flowData JSON 文字列を決める。
// - 既に妥当な flowData を持つ (already-new) なら冪等にそのまま返す
// - それ以外は reactFlowData を変換し、warnings を畳み込んで返す
// - reactFlowData が壊れている / 変換不能なら空の defaultFlowData にフォールバック
export function migrateRecordToFlowData(reactFlowData: unknown, existingFlowData: unknown): string {
  if (typeof existingFlowData === "string" && existingFlowData !== "") {
    try {
      FlowDataSchema.parse(JSON.parse(existingFlowData));
      return existingFlowData;
    } catch {
      // 壊れた既存 flowData は信用せず reactFlowData から再構築する
    }
  }

  let input: unknown;
  try {
    input = typeof reactFlowData === "string" ? JSON.parse(reactFlowData) : reactFlowData;
  } catch {
    return JSON.stringify(defaultFlowData);
  }

  try {
    const { flowData, warnings } = convertReactFlowToFlowData(input ?? {});
    return JSON.stringify(foldWarningsIntoFlowData(flowData, warnings));
  } catch {
    return JSON.stringify(defaultFlowData);
  }
}

type MigratableRecord = { reactFlowData?: string; flowData?: string };

// Template / GameSession 両テーブルへ flowData を付与する。reactFlowData は保持。
// version(7).upgrade から呼ばれる実体。両テーブルが同じ純粋変換を共有する。
export async function applyFlowDataMigration(tx: Transaction): Promise<void> {
  for (const tableName of ["Template", "GameSession"]) {
    await tx
      .table(tableName)
      .toCollection()
      .modify((record: MigratableRecord) => {
        record.flowData = migrateRecordToFlowData(record.reactFlowData, record.flowData);
      });
  }
}
