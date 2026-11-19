import { validatePair } from "@/components/Node/utils/recordCombination";
import { fisherYatesShuffle } from "@/components/Node/utils/shuffle";

import type { KanbanStep, RecordCombinationStep } from "../schema";

type Shuffle = <T>(array: T[]) => T[];

const trimmed = (values: string[]): string[] =>
  values.map((value) => value.trim()).filter((value) => value !== "");

export const counterNextValue = (current: string | undefined, step: number): string => {
  const base = Number(current ?? "0");
  return String((Number.isFinite(base) ? base : 0) + step);
};

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

export const kanbanBoardPlacements = (step: KanbanStep): { cardId: string; columnId: string }[] =>
  step.cardPlacements.length > 0 ? step.cardPlacements : step.initialPlacements;

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
