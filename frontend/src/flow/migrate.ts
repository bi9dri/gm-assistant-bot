import type { Transaction } from "dexie";

import type { ConversionWarning } from "./convert";
import type { FlowData, Step } from "./schema";

import { convertReactFlowToFlowData } from "./convert";
import { FlowDataSchema, defaultFlowData } from "./schema";

// reactFlowData → flowData の Dexie マイグレーション (issue #182 Phase 1)。
// 変換そのものは convert.ts。ここは純粋な変換ラッパー 3 種
// (reactFlowToFlowData / foldWarningsIntoFlowData / migrateRecordToFlowData) と、
// それを両テーブルへ適用する副作用 orchestrator (applyFlowDataMigration) を持つ。
// database.ts の version(7).upgrade は applyFlowDataMigration を呼ぶだけ。

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
// nodeId がステップに一致→そのステップ memo、セクションに一致→そのセクション memo、
// それ以外 (グローバル警告・未実体化グループ等) は先頭セクション memo へ集約する。
// セクションが無ければ受け皿セクションを 1 つ作る。
export function foldWarningsIntoFlowData(
  flowData: FlowData,
  warnings: ConversionWarning[],
): FlowData {
  if (warnings.length === 0) return flowData;

  const next = structuredClone(flowData);
  const stepsById = indexStepsById(next);
  const sectionsById = new Map(next.sections.map((section) => [section.id, section]));
  const leftover: string[] = [];

  for (const warning of warnings) {
    const step = warning.nodeId === undefined ? undefined : stepsById.get(warning.nodeId);
    if (step) {
      step.memo = appendMemo(step.memo, `${WARNING_PREFIX} ${warning.message}`);
      continue;
    }
    const section = warning.nodeId === undefined ? undefined : sectionsById.get(warning.nodeId);
    if (section) {
      section.memo = appendMemo(section.memo, `${WARNING_PREFIX} ${warning.message}`);
      continue;
    }
    leftover.push(warning.message);
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

// reactFlowData (パース済みオブジェクト) を FlowData へ best-effort 変換し、warnings を
// メモへ畳み込む。変換が throw した場合 (例: 形が不正で ConvertInputSchema が ZodError、
// または converter のバグ) は、空フローを無言で返さず、ログを残しつつ警告メモ付きの
// 空フローにフォールバックする (本 PR の「捨てずに surface」方針)。
// migration の upgrade トランザクションと Template.import の両方から呼ばれる。再 throw
// しないのは、upgrade では DB の version 移行ごと中断してアプリが開けなくなり、import では
// Template.create 済みの半端なレコードが取り残されるため。失敗はログ + メモで surface する。
export function reactFlowToFlowData(input: unknown): FlowData {
  try {
    const { flowData, warnings } = convertReactFlowToFlowData(input ?? {});
    return foldWarningsIntoFlowData(flowData, warnings);
  } catch (error) {
    console.error("flowData migration: reactFlowData の変換に失敗しました", error);
    const detail = error instanceof Error ? error.message : String(error);
    return foldWarningsIntoFlowData(defaultFlowData, [
      {
        message: `reactFlowData を変換できなかったため空のフローにフォールバックしました: ${detail}`,
      },
    ]);
  }
}

// レコード 1 件に保存する flowData JSON 文字列を決める。
// - 既に妥当な flowData を持つ (already-new) なら冪等にそのまま返す
// - それ以外は reactFlowData を変換して返す (警告はメモへ畳み込み済み)
// - reactFlowData が JSON として壊れていれば、警告メモ付きの空フローにフォールバック
//   (変換失敗時と同じく「捨てずに surface」する)
export function migrateRecordToFlowData(reactFlowData: unknown, existingFlowData: unknown): string {
  if (typeof existingFlowData === "string" && existingFlowData !== "") {
    try {
      FlowDataSchema.parse(JSON.parse(existingFlowData));
      return existingFlowData;
    } catch (error) {
      // 壊れた既存 flowData は信用せず reactFlowData から再構築する (ログは残す)
      console.error("flowData migration: 既存 flowData が不正なため再構築します", error);
    }
  }

  let input: unknown;
  try {
    input = typeof reactFlowData === "string" ? JSON.parse(reactFlowData) : reactFlowData;
  } catch (error) {
    console.error("flowData migration: reactFlowData が不正な JSON です", error);
    const detail = error instanceof Error ? error.message : String(error);
    return JSON.stringify(
      foldWarningsIntoFlowData(defaultFlowData, [
        {
          message: `reactFlowData が不正な JSON のため空のフローにフォールバックしました: ${detail}`,
        },
      ]),
    );
  }

  return JSON.stringify(reactFlowToFlowData(input));
}

type MigratableRecord = { reactFlowData?: string; flowData?: string };

// Template / GameSession 両テーブルへ flowData を付与する副作用 orchestrator。
// reactFlowData は保持。version(7).upgrade から呼ばれる実体で、両テーブルが同じ純粋
// 変換 (migrateRecordToFlowData) を共有する。
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
