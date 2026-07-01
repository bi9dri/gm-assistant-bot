import { ResourceSelector } from "@/components/Node/utils";

import { DeleteRoleStepSchema, type DeleteRoleStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const nonEmpty = (values: string[]): string[] => values.filter((value) => value.trim() !== "");

const DeleteRoleDetailPanel = ({ step, onChange }: DetailPanelProps<DeleteRoleStep>) => (
  <div className="flex flex-col gap-2">
    <label className="label cursor-pointer justify-start gap-2">
      <input
        type="checkbox"
        className="checkbox"
        checked={step.deleteAll}
        onChange={(evt) => onChange({ deleteAll: evt.target.checked })}
      />
      <span className="label-text">すべて削除</span>
    </label>

    {!step.deleteAll && (
      <>
        {step.roleNames.map((name, index) => (
          // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
          <div key={`role-${index}`} className="flex items-center gap-2">
            <div className="flex-1">
              <ResourceSelector
                nodeId={step.id}
                resourceType="role"
                value={name}
                onChange={(newName) =>
                  onChange({ roleNames: step.roleNames.map((v, i) => (i === index ? newName : v)) })
                }
                placeholder="ロール名を入力"
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange({ roleNames: step.roleNames.filter((_, i) => i !== index) })}
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm self-start"
          onClick={() => onChange({ roleNames: [...step.roleNames, ""] })}
        >
          ロールを追加
        </button>
      </>
    )}
  </div>
);

export const DeleteRoleEntry = defineStep<DeleteRoleStep>({
  type: "DeleteRole",
  schema: DeleteRoleStepSchema,
  category: "action",
  defaults: () => ({
    type: "DeleteRole",
    title: "ロールを削除する",
    memo: "",
    autoAdvance: false,
    deleteAll: false,
    roleNames: [],
  }),
  summary: (step) => {
    if (step.deleteAll) return "ロール削除: すべて";
    const names = nonEmpty(step.roleNames);
    return names.length > 0 ? `ロール削除: ${names.join(", ")}` : "ロール削除 (未設定)";
  },
  DetailPanel: DeleteRoleDetailPanel,
  execute: async (step, ctx) => {
    const sessionRoles = ctx.resources.roles;

    // resources.roles を splice する removeRole と反復が競合しないよう、対象はコピーで持つ。
    let targets: typeof sessionRoles;
    if (step.deleteAll) {
      if (sessionRoles.length === 0)
        return { status: "error", message: "削除するロールがありません" };
      targets = [...sessionRoles];
    } else {
      const validNames = nonEmpty(step.roleNames);
      if (validNames.length === 0)
        return { status: "error", message: "ロール名を入力してください" };
      const notFound: string[] = [];
      targets = [];
      for (const name of validNames) {
        const found = sessionRoles.find((role) => role.name === name);
        if (found === undefined) notFound.push(name);
        else targets.push(found);
      }
      if (notFound.length > 0) {
        return { status: "error", message: `ロールが見つかりません: ${notFound.join(", ")}` };
      }
    }

    const failed: string[] = [];
    for (const role of targets) {
      try {
        await ctx.discord.deleteRole(role.id);
        await ctx.resources.removeRole(role.id);
      } catch {
        failed.push(role.name);
      }
    }
    if (failed.length > 0) {
      return { status: "error", message: `ロールの削除に失敗しました: ${failed.join(", ")}` };
    }
    return { status: "success", message: `${targets.length}件のロールを削除しました` };
  },
});
