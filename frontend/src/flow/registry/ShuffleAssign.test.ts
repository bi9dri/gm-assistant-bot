import { describe, expect, test } from "bun:test";

import type { ShuffleAssignStep } from "../schema";

import { ShuffleAssignEntry } from "./ShuffleAssign";

const makeStep = (overrides: Partial<ShuffleAssignStep> = {}): ShuffleAssignStep => ({
  id: "step-1",
  type: "ShuffleAssign",
  title: "シャッフル割り当て",
  memo: "",
  autoAdvance: false,
  items: [""],
  targets: [""],
  resultFlagPrefix: "",
  ...overrides,
});

describe("ShuffleAssignEntry.summary", () => {
  test("項目・対象が空ならフォールバック", () => {
    expect(ShuffleAssignEntry.summary(makeStep())).toBe("シャッフル割り当て (未設定)");
  });

  test("項目のみ設定はフォールバック", () => {
    expect(ShuffleAssignEntry.summary(makeStep({ items: ["A", "B"] }))).toBe(
      "シャッフル割り当て (未設定)",
    );
  });

  test("対象のみ設定はフォールバック", () => {
    expect(ShuffleAssignEntry.summary(makeStep({ targets: ["X"] }))).toBe(
      "シャッフル割り当て (未設定)",
    );
  });

  test("有効な項目数と対象数を要約 (空文字は除外)", () => {
    const step = makeStep({ items: ["A", "B", ""], targets: ["X", "Y"] });
    expect(ShuffleAssignEntry.summary(step)).toBe("シャッフル割り当て: 2項目 → 2対象");
  });
});
