import { describe, expect, test } from "bun:test";

import type { KanbanStep, RecordCombinationStep } from "../schema";

import {
  counterNextValue,
  drawRandomSelect,
  kanbanBoardPlacements,
  moveKanbanCard,
  recordPair,
  shuffleAssign,
} from "./toolOperate";

// 決定的に検証するため恒等シャッフルを渡す。
const identity = <T>(array: T[]): T[] => [...array];

describe("counterNextValue", () => {
  test("現在値に step を足す", () => {
    expect(counterNextValue("3", 1)).toBe("4");
    expect(counterNextValue("10", 5)).toBe("15");
  });

  test("未設定や数値化不能は 0 起点", () => {
    expect(counterNextValue(undefined, 2)).toBe("2");
    expect(counterNextValue("abc", 1)).toBe("1");
  });
});

describe("drawRandomSelect", () => {
  test("恒等シャッフルなら先頭を選ぶ", () => {
    expect(drawRandomSelect(["A", "B", "C"], identity)).toBe("A");
  });

  test("空白を除外する", () => {
    expect(drawRandomSelect(["  ", "B"], identity)).toBe("B");
  });

  test("候補が空なら undefined", () => {
    expect(drawRandomSelect([" ", ""], identity)).toBeUndefined();
  });
});

describe("shuffleAssign", () => {
  test("items を targets にラウンドロビンで割り当てフラグへ集約する", () => {
    const result = shuffleAssign(["a", "b", "c"], ["X", "Y"], "assign", identity);
    expect(result?.assignedResults).toEqual({ X: ["a", "c"], Y: ["b"] });
    expect(result?.flagPatch).toEqual({ assign_X: "a, c", assign_Y: "b" });
  });

  test("items か targets が空なら undefined", () => {
    expect(shuffleAssign([], ["X"], "p", identity)).toBeUndefined();
    expect(shuffleAssign(["a"], [], "p", identity)).toBeUndefined();
  });
});

const makeKanban = (overrides: Partial<KanbanStep> = {}): KanbanStep => ({
  id: "k1",
  type: "Kanban",
  title: "カンバン",
  memo: "",
  autoAdvance: false,
  columns: [
    { id: "col1", label: "未" },
    { id: "col2", label: "済" },
  ],
  cards: [
    { id: "card1", label: "A" },
    { id: "card2", label: "B" },
  ],
  initialPlacements: [
    { cardId: "card1", columnId: "col1" },
    { cardId: "card2", columnId: "col1" },
  ],
  cardPlacements: [],
  ...overrides,
});

describe("kanbanBoardPlacements", () => {
  test("cardPlacements が空なら initialPlacements を盤面として見せる", () => {
    expect(kanbanBoardPlacements(makeKanban())).toEqual([
      { cardId: "card1", columnId: "col1" },
      { cardId: "card2", columnId: "col1" },
    ]);
  });

  test("一度でも動かした後は cardPlacements が優先", () => {
    const step = makeKanban({
      cardPlacements: [{ cardId: "card1", columnId: "col2", movedAt: new Date() }],
    });
    expect(kanbanBoardPlacements(step)).toEqual(step.cardPlacements);
  });
});

describe("moveKanbanCard", () => {
  const now = new Date("2026-07-18T00:00:00Z");

  test("初回移動は initialPlacements から盤面を確定してから動かす", () => {
    expect(moveKanbanCard(makeKanban(), "card1", "col2", now)).toEqual([
      { cardId: "card1", columnId: "col2", movedAt: now },
      { cardId: "card2", columnId: "col1", movedAt: now },
    ]);
  });

  test("既存の配置は上書き、未配置カードは追加", () => {
    const step = makeKanban({
      cardPlacements: [{ cardId: "card1", columnId: "col1", movedAt: new Date(0) }],
    });
    expect(moveKanbanCard(step, "card1", "col2", now)).toEqual([
      { cardId: "card1", columnId: "col2", movedAt: now },
    ]);
    expect(moveKanbanCard(step, "card2", "col2", now)).toEqual([
      { cardId: "card1", columnId: "col1", movedAt: new Date(0) },
      { cardId: "card2", columnId: "col2", movedAt: now },
    ]);
  });
});

const makeRecordCombination = (
  overrides: Partial<RecordCombinationStep> = {},
): RecordCombinationStep => ({
  id: "rc1",
  type: "RecordCombination",
  title: "組み合わせを記録",
  memo: "",
  autoAdvance: false,
  config: {
    mode: "same-set",
    allowSelfPairing: false,
    allowDuplicates: false,
    distinguishOrder: true,
    allowMultipleAssignments: false,
  },
  sourceOptions: {
    label: "選択肢A",
    items: [
      { id: "p1", label: "太郎" },
      { id: "p2", label: "花子" },
    ],
  },
  recordedPairs: [],
  ...overrides,
});

describe("recordPair", () => {
  const now = new Date("2026-07-18T00:00:00Z");

  test("有効なペアを追加した recordedPairs を返す", () => {
    expect(recordPair(makeRecordCombination(), "p1", "p2", "pair1", now)).toEqual([
      { id: "pair1", sourceId: "p1", targetId: "p2", recordedAt: now },
    ]);
  });

  test("自己ペアは無効 (allowSelfPairing=false)", () => {
    expect(recordPair(makeRecordCombination(), "p1", "p1", "pair1", now)).toBeUndefined();
  });

  test("重複ペアは無効 (allowDuplicates=false)", () => {
    const step = makeRecordCombination({
      recordedPairs: [{ id: "pair1", sourceId: "p1", targetId: "p2", recordedAt: now }],
    });
    expect(recordPair(step, "p1", "p2", "pair2", now)).toBeUndefined();
  });

  test("順序を区別しない場合は逆向きも重複扱い", () => {
    const step = makeRecordCombination({
      config: {
        mode: "same-set",
        allowSelfPairing: false,
        allowDuplicates: false,
        distinguishOrder: false,
        allowMultipleAssignments: false,
      },
      recordedPairs: [{ id: "pair1", sourceId: "p1", targetId: "p2", recordedAt: now }],
    });
    expect(recordPair(step, "p2", "p1", "pair2", now)).toBeUndefined();
  });
});
