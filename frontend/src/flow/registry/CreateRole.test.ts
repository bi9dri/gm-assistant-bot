import { describe, expect, test } from "bun:test";

import type { CreateRoleStep } from "../schema";

import { CreateRoleEntry } from "./CreateRole";

const makeStep = (overrides: Partial<CreateRoleStep> = {}): CreateRoleStep => ({
  id: "step-1",
  type: "CreateRole",
  title: "ロールを作成する",
  memo: "",
  autoAdvance: false,
  roles: [],
  ...overrides,
});

describe("CreateRoleEntry.summary", () => {
  test("ロール未設定はフォールバック", () => {
    expect(CreateRoleEntry.summary(makeStep())).toBe("ロール作成 (未設定)");
  });

  test("ロールを列挙して要約", () => {
    expect(CreateRoleEntry.summary(makeStep({ roles: ["市民", "人狼"] }))).toBe(
      "ロール作成: 市民, 人狼",
    );
  });
});
