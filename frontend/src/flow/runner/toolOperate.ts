import { fisherYatesShuffle } from "@/components/Node/utils/shuffle";

// ツールの「操作」ロジック (旧 Counter/RandomSelect/ShuffleAssign ノードから抽出)。
// フラグへの副作用ではなく次の値/結果を返す純関数にして unit-test 可能にする。
// shuffle は差し替え可能 (テストでは恒等シャッフルを渡して決定的に検証する)。

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
