import { describe, expect, test } from "bun:test";

import type { ConditionNode } from "@/components/Node/utils/evaluateCondition";

import type { BranchArm, BranchStep } from "../schema";

import { selectAutoArms } from "./branch";

const rule = (flagKey: string, value: string): ConditionNode => ({
  type: "rule",
  id: `r-${flagKey}`,
  flagKey,
  operator: "equals",
  value,
  valueType: "literal",
});

const arm = (id: string, overrides: Partial<BranchArm> = {}): BranchArm => ({
  id,
  label: id,
  steps: [],
  ...overrides,
});

const autoBranch = (branches: BranchArm[], matchMode: BranchStep["matchMode"]): BranchStep => ({
  id: "br",
  type: "Branch",
  title: "分岐",
  memo: "",
  autoAdvance: false,
  mode: "auto",
  matchMode,
  flagName: "",
  branches,
});

describe("selectAutoArms (first)", () => {
  test("最初にマッチした条件枝を返す", () => {
    const step = autoBranch(
      [arm("a", { condition: rule("team", "red") }), arm("b", { condition: rule("team", "blue") })],
      "first",
    );
    expect(selectAutoArms(step, { team: "blue" })).toEqual(["b"]);
  });

  test("どれもマッチしなければデフォルト枝 (末尾の条件なし) を返す", () => {
    const step = autoBranch(
      [arm("a", { condition: rule("team", "red") }), arm("default")],
      "first",
    );
    expect(selectAutoArms(step, { team: "green" })).toEqual(["default"]);
  });

  test("デフォルト枝も無くマッチしなければ空", () => {
    const step = autoBranch([arm("a", { condition: rule("team", "red") })], "first");
    expect(selectAutoArms(step, { team: "green" })).toEqual([]);
  });
});

describe("selectAutoArms (all)", () => {
  test("マッチした全条件枝を順に返す", () => {
    const step = autoBranch(
      [
        arm("a", { condition: rule("x", "1") }),
        arm("b", { condition: rule("y", "1") }),
        arm("c", { condition: rule("z", "1") }),
      ],
      "all",
    );
    expect(selectAutoArms(step, { x: "1", z: "1" })).toEqual(["a", "c"]);
  });

  test("1つもマッチしなければデフォルト枝にフォールバック", () => {
    const step = autoBranch([arm("a", { condition: rule("x", "1") }), arm("default")], "all");
    expect(selectAutoArms(step, { x: "0" })).toEqual(["default"]);
  });
});
