import { validatePair } from "@/components/Node/utils/recordCombination";
import { fisherYatesShuffle } from "@/components/Node/utils/shuffle";

import type { KanbanStep, RecordCombinationStep } from "../schema";

// ツールの「操作」ロジック (旧 Counter/RandomSelect/ShuffleAssign/Kanban/RecordCombination
// ノードから抽出)。フラグ/ステップへの副作用ではなく次の値/結果を返す純関数にして
// unit-test 可能にする。shuffle は差し替え可能 (テストでは恒等シャッフルを渡して検証する)。

type Shuffle = <T>(array: T[]) => T[];

const trimmed = (values: string[]): string[] =>
  values.map((value) => value.trim()).filter((value) => value !== "");

// Counter: 現在値 (数値化不能なら 0) に step を足した文字列。
export const counterNextValue = (current: string | undefined, step: number): string => {
  const base = Number(current ?? "0");
  return String((Number.isFinite(base) ? base : 0) + step);
};

// RandomSelect: 候補から 1 つ抽選する。候補が空なら undefined。
export const drawRandomSelect = (
  items: string[],
  shuffle: Shuffle = fisherYatesShuffle,
): string | undefined => {
  const valid = trimmed(items);
  if (valid.length === 0) return undefined;
  return shuffle(valid)[0];
};

interface ShuffleAssignResult {
  assignedResults: Record<string, string[]>;
  flagPatch: Record<string, string>;
}

// ShuffleAssign: items を targets にラウンドロビンで割り当て、`prefix_target` フラグに集約する。
// items か targets が空なら undefined。
export const shuffleAssign = (
  items: string[],
  targets: string[],
  prefix: string,
  shuffle: Shuffle = fisherYatesShuffle,
): ShuffleAssignResult | undefined => {
  const validItems = trimmed(items);
  const validTargets = trimmed(targets);
  if (validItems.length === 0 || validTargets.length === 0) return undefined;

  const shuffledItems = shuffle(validItems);
  const shuffledTargets = shuffle(validTargets);
  const assignedResults: Record<string, string[]> = {};
  for (const target of shuffledTargets) assignedResults[target] = [];
  shuffledItems.forEach((item, index) => {
    const target = shuffledTargets[index % shuffledTargets.length];
    assignedResults[target]?.push(item);
  });

  const flagPatch: Record<string, string> = {};
  for (const [target, assigned] of Object.entries(assignedResults)) {
    if (assigned.length > 0) flagPatch[`${prefix}_${target}`] = assigned.join(", ");
  }
  return { assignedResults, flagPatch };
};

type CardPlacement = KanbanStep["cardPlacements"][number];

// Kanban: 実行時盤面の表示用配置。カードがまだ一度も動かされていなければ
// initialPlacements を盤面として見せる (旧 KanbanNode の execute モード初期化と同義)。
export const kanbanBoardPlacements = (step: KanbanStep): { cardId: string; columnId: string }[] =>
  step.cardPlacements.length > 0 ? step.cardPlacements : step.initialPlacements;

// Kanban: カード移動後の cardPlacements。初回移動時は initialPlacements から盤面を
// 確定した上で動かす。配置の並び順に意味はない (表示順は step.cards 由来)。
export const moveKanbanCard = (
  step: KanbanStep,
  cardId: string,
  columnId: string,
  movedAt: Date = new Date(),
): CardPlacement[] => {
  const base: CardPlacement[] =
    step.cardPlacements.length > 0
      ? step.cardPlacements
      : step.initialPlacements.map((placement) => ({ ...placement, movedAt }));
  return [
    ...base.filter((placement) => placement.cardId !== cardId),
    { cardId, columnId, movedAt },
  ];
};

// RecordCombination: ペアを検証して追加した recordedPairs を返す。
// 無効 (重複・自己ペア等) なら undefined。
export const recordPair = (
  step: RecordCombinationStep,
  sourceId: string,
  targetId: string,
  id: string,
  recordedAt: Date = new Date(),
): RecordCombinationStep["recordedPairs"] | undefined => {
  const validation = validatePair(step.config, step.recordedPairs, sourceId, targetId);
  if (!validation.valid) return undefined;
  return [...step.recordedPairs, { id, sourceId, targetId, recordedAt }];
};
