import { describe, expect, test } from "bun:test";

import type { RandomSelectStep } from "../schema";

import { RandomSelectEntry } from "./RandomSelect";

const makeStep = (overrides: Partial<RandomSelectStep> = {}): RandomSelectStep => ({
  id: "step-1",
  type: "RandomSelect",
  title: "ランダム選択",
  memo: "",
  autoAdvance: false,
  items: [""],
  resultFlagKey: "",
  ...overrides,
});

describe("RandomSelectEntry.summary", () => {
  test("候補・フラグが空ならフォールバック", () => {
    expect(RandomSelectEntry.summary(makeStep())).toBe("ランダム選択 (未設定)");
  });

  test("候補のみ設定はフォールバック", () => {
    expect(RandomSelectEntry.summary(makeStep({ items: ["A", "B"] }))).toBe(
      "ランダム選択 (未設定)",
    );
  });

  test("フラグのみ設定はフォールバック", () => {
    expect(RandomSelectEntry.summary(makeStep({ resultFlagKey: "犯人" }))).toBe(
      "ランダム選択 (未設定)",
    );
  });

  test("有効な候補数とフラグ名を要約 (空文字は除外)", () => {
    const step = makeStep({ items: ["A", "B", "", "C"], resultFlagKey: "犯人" });
    expect(RandomSelectEntry.summary(step)).toBe("ランダム選択: 3候補 → 犯人");
  });
});
