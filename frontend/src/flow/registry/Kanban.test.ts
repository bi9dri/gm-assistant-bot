import { describe, expect, test } from "bun:test";

import { KanbanStepSchema, type KanbanStep } from "../schema";
import { KanbanEntry } from "./Kanban";

const item = (id: string, label: string): KanbanStep["columns"][number] => ({ id, label });

const kanbanStep = (overrides: Partial<KanbanStep> = {}): KanbanStep => ({
  id: "kanban-1",
  type: "Kanban",
  title: "カンバン",
  memo: "",
  autoAdvance: false,
  columns: [],
  cards: [],
  initialPlacements: [],
  cardPlacements: [],
  ...overrides,
});

describe("KanbanEntry.defaults", () => {
  test("schema を満たす初期値を返す", () => {
    const parsed = KanbanStepSchema.parse({ id: "kanban-1", ...KanbanEntry.defaults() });
    expect(parsed.type).toBe("Kanban");
    expect(parsed.columns).toEqual([]);
    expect(parsed.cards).toEqual([]);
    expect(parsed.initialPlacements).toEqual([]);
    expect(parsed.cardPlacements).toEqual([]);
  });
});

describe("KanbanEntry.summary", () => {
  test("未設定 (列もカードも無し) はフォールバック", () => {
    expect(KanbanEntry.summary(kanbanStep())).toBe("カンバン (未設定)");
  });

  test("カード枚数と列数を表示する", () => {
    const step = kanbanStep({
      columns: [item("c1", "todo"), item("c2", "done")],
      cards: [item("k1", "A"), item("k2", "B"), item("k3", "C")],
    });
    expect(KanbanEntry.summary(step)).toBe("カンバン: 3枚 / 2列");
  });

  test("列のみ・カードのみでもフォールバックにならない", () => {
    expect(KanbanEntry.summary(kanbanStep({ columns: [item("c1", "todo")] }))).toBe(
      "カンバン: 0枚 / 1列",
    );
    expect(KanbanEntry.summary(kanbanStep({ cards: [item("k1", "A")] }))).toBe(
      "カンバン: 1枚 / 0列",
    );
  });
});
