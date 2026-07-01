import { describe, expect, test } from "bun:test";

import type { Step } from "../schema";

import { canRunStep } from "./canRun";

const step = (overrides: Partial<Step>): Step =>
  ({
    id: "s",
    title: "",
    memo: "",
    autoAdvance: false,
    ...overrides,
  }) as Step;

describe("canRunStep", () => {
  test("action は実行可能", () => {
    expect(canRunStep(step({ type: "SetGameFlag", flagKey: "k", flagValue: "v" }))).toBe(true);
  });

  test("auto 分岐は実行可能", () => {
    expect(
      canRunStep(
        step({ type: "Branch", mode: "auto", matchMode: "first", flagName: "", branches: [] }),
      ),
    ).toBe(true);
  });

  test("select 分岐は枝選択が必要なので不可", () => {
    expect(
      canRunStep(
        step({ type: "Branch", mode: "select", matchMode: "first", flagName: "", branches: [] }),
      ),
    ).toBe(false);
  });

  test("tool (execute なし) は不可", () => {
    expect(canRunStep(step({ type: "Counter", flagKey: "k", step: 1 }))).toBe(false);
  });
});
