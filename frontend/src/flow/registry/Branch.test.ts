import { describe, expect, test } from "bun:test";

import { BranchStepSchema, type BranchArm, type BranchStep } from "../schema";
import { BranchEntry } from "./Branch";

const arm = (label: string, overrides: Partial<BranchArm> = {}): BranchArm => ({
  id: `arm-${label}`,
  label,
  steps: [],
  ...overrides,
});

const branchStep = (overrides: Partial<BranchStep> = {}): BranchStep => ({
  id: "branch-1",
  type: "Branch",
  title: "分岐する",
  memo: "",
  autoAdvance: false,
  mode: "auto",
  matchMode: "first",
  flagName: "",
  branches: [arm("枝1")],
  ...overrides,
});

describe("BranchEntry.defaults", () => {
  test("schema を満たす初期値を返す", () => {
    const parsed = BranchStepSchema.parse({ id: "branch-1", ...BranchEntry.defaults() });
    expect(parsed.type).toBe("Branch");
    expect(parsed.mode).toBe("auto");
    expect(parsed.matchMode).toBe("first");
    expect(parsed.flagName).toBe("");
    expect(parsed.branches).toHaveLength(1);
    expect(parsed.branches[0].steps).toEqual([]);
  });
});

describe("BranchEntry.summary", () => {
  test("auto モードは枝数を表示する", () => {
    const step = branchStep({ mode: "auto", branches: [arm("枝1"), arm("枝2")] });
    expect(BranchEntry.summary(step)).toBe("分岐(自動): 2枝");
  });

  test("select モードは flagName と枝数を表示する", () => {
    const step = branchStep({
      mode: "select",
      flagName: "選択結果",
      branches: [arm("A"), arm("B"), arm("C")],
    });
    expect(BranchEntry.summary(step)).toBe("分岐(選択): 選択結果 / 3枝");
  });

  test("select モードで flagName 未設定はフォールバック", () => {
    const step = branchStep({ mode: "select", flagName: "  " });
    expect(BranchEntry.summary(step)).toBe("分岐(選択): (未設定) / 1枝");
  });
});
