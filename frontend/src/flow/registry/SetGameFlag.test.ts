import { describe, expect, test } from "bun:test";

import type { SetGameFlagStep } from "../schema";

import { SetGameFlagEntry } from "./SetGameFlag";

const makeStep = (overrides: Partial<SetGameFlagStep> = {}): SetGameFlagStep => ({
  id: "step-1",
  type: "SetGameFlag",
  title: "ゲームフラグを設定する",
  memo: "",
  autoAdvance: false,
  flagKey: "",
  flagValue: "",
  ...overrides,
});

describe("SetGameFlagEntry.summary", () => {
  test("flagKey 未設定はフォールバック", () => {
    expect(SetGameFlagEntry.summary(makeStep())).toBe("フラグ設定 (未設定)");
  });

  test("flagKey と flagValue を要約", () => {
    expect(SetGameFlagEntry.summary(makeStep({ flagKey: "phase", flagValue: "day" }))).toBe(
      "フラグ設定: phase = day",
    );
  });

  test("flagValue 空は (空) を表示", () => {
    expect(SetGameFlagEntry.summary(makeStep({ flagKey: "phase", flagValue: "" }))).toBe(
      "フラグ設定: phase = (空)",
    );
  });
});
