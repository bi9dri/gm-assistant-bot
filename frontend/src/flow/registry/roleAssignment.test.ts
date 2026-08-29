import { describe, expect, test } from "bun:test";

import { resolveAssignments } from "./roleAssignment";

const members = [
  { id: "u1", name: "アリス" },
  { id: "u2", name: "ボブ" },
];
const roles = [
  { id: "r1", name: "探偵" },
  { id: "r2", name: "犯人" },
];

describe("resolveAssignments", () => {
  test("プレフィックス付きフラグを配役に変換する", () => {
    const resolved = resolveAssignments(
      { 役_アリス: "探偵", 役_ボブ: "犯人", メモ: "無関係" },
      "役",
      members,
      roles,
    );
    expect(resolved.assignments).toEqual([
      { memberId: "u1", memberName: "アリス", roleId: "r1", roleName: "探偵" },
      { memberId: "u2", memberName: "ボブ", roleId: "r2", roleName: "犯人" },
    ]);
    expect(resolved.missingMembers).toEqual([]);
    expect(resolved.missingRoles).toEqual([]);
  });

  test("シャッフル割り当てが連結した複数ロールを分解する", () => {
    const resolved = resolveAssignments({ 役_アリス: "探偵, 犯人" }, "役", members, roles);
    expect(resolved.assignments.map((a) => a.roleName)).toEqual(["探偵", "犯人"]);
  });

  test("表示名は大小文字を無視して照合する", () => {
    const resolved = resolveAssignments(
      { 役_ALICE: "探偵" },
      "役",
      [{ id: "u1", name: "alice" }],
      roles,
    );
    expect(resolved.assignments).toHaveLength(1);
  });

  test("ギルドに居ない表示名を missingMembers に集める", () => {
    const resolved = resolveAssignments({ 役_キャロル: "探偵" }, "役", members, roles);
    expect(resolved.missingMembers).toEqual(["キャロル"]);
    expect(resolved.assignments).toEqual([]);
  });

  test("存在しないロール名を missingRoles に集める", () => {
    const resolved = resolveAssignments({ 役_アリス: "村人" }, "役", members, roles);
    expect(resolved.missingRoles).toEqual(["村人"]);
    expect(resolved.assignments).toEqual([]);
  });

  test("プレフィックスが一致しないフラグは無視する", () => {
    const resolved = resolveAssignments({ 配役_アリス: "探偵" }, "役", members, roles);
    expect(resolved.assignments).toEqual([]);
  });
});
