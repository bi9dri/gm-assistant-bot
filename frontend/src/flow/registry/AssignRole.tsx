import { ResourceSelector } from "@/components/Node/utils/ResourceSelector";

import { AssignRoleStepSchema, type AssignRoleStep } from "../schema";
import { resolveAssignments } from "./roleAssignment";
import { defineStep, type DetailPanelProps } from "./types";

const AssignRoleDetailPanel = ({ step, onChange }: DetailPanelProps<AssignRoleStep>) => (
  <div className="flex flex-col gap-3">
    <fieldset className="fieldset">
      <legend className="fieldset-legend">配役フラグのプレフィックス</legend>
      <ResourceSelector
        nodeId={step.id}
        resourceType="gameFlag"
        value={step.flagPrefix}
        onChange={(value) => onChange({ flagPrefix: value })}
        placeholder="例: 役"
      />
    </fieldset>
    <p className="text-xs text-base-content/60">
      「プレフィックス_表示名 = ロール名」のフラグを配役表として読み、その Discord
      ユーザーにロールを付与します。シャッフル割り当てのプレフィックスを指定してください。
    </p>
  </div>
);

export const AssignRoleEntry = defineStep<AssignRoleStep>({
  type: "AssignRole",
  schema: AssignRoleStepSchema,
  category: "action",
  defaults: () => ({
    type: "AssignRole",
    title: "配役",
    memo: "",
    autoAdvance: false,
    // schema が非空を要求するため placeholder を入れる。
    flagPrefix: "役",
  }),
  summary: (step) => {
    const prefix = step.flagPrefix.trim();
    return prefix === "" ? "配役 (未設定)" : `配役: ${prefix}_* のフラグに従って付与`;
  },
  DetailPanel: AssignRoleDetailPanel,
  execute: async (step, ctx) => {
    const prefix = step.flagPrefix.trim();
    if (prefix === "") {
      return { status: "error", message: "配役フラグのプレフィックスを入力してください" };
    }

    let members;
    try {
      members = await ctx.discord.listGuildMembers();
    } catch {
      return { status: "error", message: "ギルドメンバーの取得に失敗しました" };
    }

    const resolved = resolveAssignments(ctx.flags.get(), prefix, members, ctx.resources.roles);
    if (resolved.missingMembers.length > 0) {
      return {
        status: "error",
        message: `メンバーが見つかりません: ${resolved.missingMembers.join(", ")}`,
      };
    }
    if (resolved.missingRoles.length > 0) {
      return {
        status: "error",
        message: `ロールが存在しません: ${resolved.missingRoles.join(", ")}`,
      };
    }
    if (resolved.assignments.length === 0) {
      return { status: "error", message: `「${prefix}_」で始まるフラグがありません` };
    }

    try {
      for (const assignment of resolved.assignments) {
        await ctx.discord.addRoleToMember({
          userId: assignment.memberId,
          roleId: assignment.roleId,
        });
      }
    } catch {
      return { status: "error", message: "ロールの付与に失敗しました" };
    }

    return {
      status: "success",
      message: resolved.assignments
        .map((assignment) => `${assignment.memberName}: ${assignment.roleName}`)
        .join(" / "),
    };
  },
});
