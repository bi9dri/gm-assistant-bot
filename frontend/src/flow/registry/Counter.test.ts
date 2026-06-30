import { describe, expect, test } from "bun:test";

import type { CounterStep } from "../schema";

import { CounterEntry } from "./Counter";

const makeStep = (overrides: Partial<CounterStep> = {}): CounterStep => ({
  id: "step-1",
  type: "Counter",
  title: "カウンター",
  memo: "",
  autoAdvance: false,
  flagKey: "",
  step: 1,
  ...overrides,
});

describe("CounterEntry.summary", () => {
  test("フラグ名未設定はフォールバック", () => {
    expect(CounterEntry.summary(makeStep())).toBe("カウンター (未設定)");
  });

  test("空白のみのフラグ名もフォールバック", () => {
    expect(CounterEntry.summary(makeStep({ flagKey: "  " }))).toBe("カウンター (未設定)");
  });

  test("フラグ名と増減量を要約", () => {
    expect(CounterEntry.summary(makeStep({ flagKey: "ラウンド数", step: 1 }))).toBe(
      "カウンター: ラウンド数 (+1)",
    );
  });

  test("増減量を反映", () => {
    expect(CounterEntry.summary(makeStep({ flagKey: "ライフ", step: 5 }))).toBe(
      "カウンター: ライフ (+5)",
    );
  });
});
