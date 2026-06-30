import { describe, expect, test } from "bun:test";

import type { AddRoleToRoleMembersStep } from "../schema";

import { AddRoleToRoleMembersEntry } from "./AddRoleToRoleMembers";

const makeStep = (overrides: Partial<AddRoleToRoleMembersStep> = {}): AddRoleToRoleMembersStep => ({
  id: "step-1",
  type: "AddRoleToRoleMembers",
  title: "ロールメンバーにロールを付与",
  memo: "",
  autoAdvance: false,
  memberRoleName: "",
  addRoleName: "",
  ...overrides,
});

describe("AddRoleToRoleMembersEntry.summary", () => {
  test("両方未設定はフォールバック", () => {
    expect(AddRoleToRoleMembersEntry.summary(makeStep())).toBe("ロール付与 (未設定)");
  });

  test("対象ロールのみ設定はフォールバック", () => {
    expect(AddRoleToRoleMembersEntry.summary(makeStep({ memberRoleName: "プレイヤー" }))).toBe(
      "ロール付与 (未設定)",
    );
  });

  test("付与ロールのみ設定はフォールバック", () => {
    expect(AddRoleToRoleMembersEntry.summary(makeStep({ addRoleName: "参加者" }))).toBe(
      "ロール付与 (未設定)",
    );
  });

  test("両方設定で要約", () => {
    const step = makeStep({ memberRoleName: "プレイヤー", addRoleName: "参加者" });
    expect(AddRoleToRoleMembersEntry.summary(step)).toBe("ロール付与: プレイヤー → 参加者");
  });
});
