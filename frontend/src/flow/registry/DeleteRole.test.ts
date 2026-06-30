import { describe, expect, test } from "bun:test";

import type { DeleteRoleStep } from "../schema";

import { DeleteRoleEntry } from "./DeleteRole";

const step = (overrides: Partial<DeleteRoleStep> = {}): DeleteRoleStep => ({
  id: "step-1",
  type: "DeleteRole",
  title: "ロールを削除する",
  memo: "",
  autoAdvance: false,
  deleteAll: false,
  roleNames: [],
  ...overrides,
});

describe("DeleteRoleEntry.summary", () => {
  test("deleteAll が true なら『すべて』を返す", () => {
    expect(DeleteRoleEntry.summary(step({ deleteAll: true, roleNames: ["無視される"] }))).toBe(
      "ロール削除: すべて",
    );
  });

  test("roleNames を列挙する", () => {
    expect(DeleteRoleEntry.summary(step({ roleNames: ["村人", "人狼"] }))).toBe(
      "ロール削除: 村人, 人狼",
    );
  });

  test("空白のみの roleNames は除外する", () => {
    expect(DeleteRoleEntry.summary(step({ roleNames: ["  ", "占い師"] }))).toBe(
      "ロール削除: 占い師",
    );
  });

  test("未設定ならフォールバック文を返す", () => {
    expect(DeleteRoleEntry.summary(step({ roleNames: [] }))).toBe("ロール削除 (未設定)");
    expect(DeleteRoleEntry.summary(step({ roleNames: ["   "] }))).toBe("ロール削除 (未設定)");
  });
});
