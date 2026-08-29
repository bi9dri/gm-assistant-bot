import { describe, expect, test } from "bun:test";

import type { AssignRoleStep } from "../schema";
import { AssignRoleEntry } from "./AssignRole";

const makeStep = (overrides: Partial<AssignRoleStep> = {}): AssignRoleStep => ({
  id: "step-1",
  type: "AssignRole",
  title: "配役",
  memo: "",
  autoAdvance: false,
  flagPrefix: "",
  ...overrides,
});

describe("AssignRoleEntry.summary", () => {
  test("プレフィックス未設定はフォールバック", () => {
    expect(AssignRoleEntry.summary(makeStep())).toBe("配役 (未設定)");
  });

  test("プレフィックス設定で要約", () => {
    expect(AssignRoleEntry.summary(makeStep({ flagPrefix: "役" }))).toBe(
      "配役: 役_* のフラグに従って付与",
    );
  });
});
