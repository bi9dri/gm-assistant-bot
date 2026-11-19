import type { Transaction } from "dexie";

import type { ConversionWarning } from "./convert";
import { convertReactFlowToFlowData } from "./convert";
import type { FlowData, Step } from "./schema";
import { FlowDataSchema, defaultFlowData } from "./schema";

const WARNING_PREFIX = "⚠️";

const appendMemo = (memo: string, text: string) => (memo === "" ? text : `${memo}\n\n${text}`);

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

export function migrateRecordToFlowData(reactFlowData: unknown, existingFlowData: unknown): string {
  if (typeof existingFlowData === "string" && existingFlowData !== "") {
    try {
      FlowDataSchema.parse(JSON.parse(existingFlowData));
      return existingFlowData;
    } catch (error) {
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
