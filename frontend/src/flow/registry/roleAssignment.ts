import type { GuildMember, SessionRole } from "../engine/types";

// 配役ブロックの純粋ロジック。ShuffleAssign が書いた `${prefix}_${表示名}` フラグを
// 「この Discord ユーザーにこのロールを付ける」という指示に変換する。

interface RoleAssignment {
  memberId: string;
  memberName: string;
  roleId: string;
  roleName: string;
}

export const resolveAssignments = (
  flags: Record<string, string>,
  prefix: string,
  members: GuildMember[],
  roles: SessionRole[],
  // missing* はギルドに居ない表示名 / セッションに存在しないロール名。呼び出し側がエラーにする。
): { assignments: RoleAssignment[]; missingMembers: string[]; missingRoles: string[] } => {
  const memberByName = new Map(members.map((member) => [member.name.toLowerCase(), member]));
  const roleByName = new Map(roles.map((role) => [role.name, role]));

  const assignments: RoleAssignment[] = [];
  const missingMembers = new Set<string>();
  const missingRoles = new Set<string>();

  for (const [key, value] of Object.entries(flags)) {
    if (!key.startsWith(`${prefix}_`)) continue;
    const memberName = key.slice(prefix.length + 1);
    const member = memberByName.get(memberName.toLowerCase());
    if (member === undefined) missingMembers.add(memberName);

    // ShuffleAssign は複数項目を ", " で連結して 1 フラグに入れる。
    for (const roleName of value.split(",").map((name) => name.trim())) {
      if (roleName === "") continue;
      const role = roleByName.get(roleName);
      if (role === undefined) {
        missingRoles.add(roleName);
        continue;
      }
      if (member === undefined) continue;
      assignments.push({
        memberId: member.id,
        memberName: member.name,
        roleId: role.id,
        roleName,
      });
    }
  }

  return {
    assignments,
    missingMembers: [...missingMembers],
    missingRoles: [...missingRoles],
  };
};
