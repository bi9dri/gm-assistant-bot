import { ResourceSelector } from "@/components/Node/utils/ResourceSelector";

import { ChangeChannelPermissionStepSchema, type ChangeChannelPermissionStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

type RolePermission = ChangeChannelPermissionStep["rolePermissions"][number];

const ChangeChannelPermissionDetailPanel = ({
  step,
  onChange,
}: DetailPanelProps<ChangeChannelPermissionStep>) => {
  const updatePermission = (index: number, patch: Partial<RolePermission>) =>
    onChange({
      rolePermissions: step.rolePermissions.map((perm, i) =>
        i === index ? { ...perm, ...patch } : perm,
      ),
    });

  return (
    <div className="space-y-3">
      <ResourceSelector
        nodeId={step.id}
        resourceType="channel"
        value={step.channelName}
        onChange={(value) => onChange({ channelName: value })}
        placeholder="チャンネル名"
      />

      <div className="alert alert-warning text-xs p-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>既存の権限はすべて上書きされます。指定しなかったロールの権限は削除されます。</span>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold">ロール権限</p>
        {step.rolePermissions.map((perm, index) => (
          // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない権限配列
          <div key={`perm-${index}`} className="flex gap-2 items-center">
            <div className="flex-1">
              <ResourceSelector
                nodeId={step.id}
                resourceType="role"
                value={perm.roleName}
                onChange={(name) => updatePermission(index, { roleName: name })}
                placeholder="ロール名"
                className="input-xs"
              />
            </div>
            <label className="flex items-center gap-1 cursor-pointer">
              <span className="text-xs">読み取り</span>
              <input
                type="checkbox"
                className="toggle toggle-xs"
                checked={perm.canWrite}
                onChange={(evt) => updatePermission(index, { canWrite: evt.target.checked })}
              />
              <span className="text-xs">書き込み</span>
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() =>
                onChange({ rolePermissions: step.rolePermissions.filter((_, i) => i !== index) })
              }
            >
              x
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() =>
            onChange({
              rolePermissions: [...step.rolePermissions, { roleName: "", canWrite: false }],
            })
          }
        >
          + ロールを追加
        </button>
      </div>
    </div>
  );
};

export const ChangeChannelPermissionEntry = defineStep<ChangeChannelPermissionStep>({
  type: "ChangeChannelPermission",
  schema: ChangeChannelPermissionStepSchema,
  category: "action",
  defaults: () => ({
    type: "ChangeChannelPermission",
    title: "チャンネル権限を変更する",
    memo: "",
    autoAdvance: false,
    channelName: "",
    rolePermissions: [],
  }),
  summary: (step) => {
    const channel = step.channelName.trim();
    if (channel === "") return "権限変更 (未設定)";
    const count = step.rolePermissions.filter((perm) => perm.roleName.trim() !== "").length;
    return `権限変更: ${channel} (${count}件)`;
  },
  DetailPanel: ChangeChannelPermissionDetailPanel,
  execute: async (step, ctx) => {
    const channelName = step.channelName.trim();
    if (channelName === "") return { status: "error", message: "チャンネル名を入力してください" };

    const channel = ctx.resources.channels.find(
      (item) => item.name.toLowerCase() === channelName.toLowerCase(),
    );
    if (channel === undefined) {
      return { status: "error", message: `チャンネル「${channelName}」が見つかりません` };
    }

    const roleNameToId = new Map(ctx.resources.roles.map((role) => [role.name, role.id]));
    const missing = [
      ...new Set(
        step.rolePermissions
          .map((perm) => perm.roleName.trim())
          .filter((name) => name !== "" && !roleNameToId.has(name)),
      ),
    ];
    if (missing.length > 0) {
      return { status: "error", message: `ロールが見つかりません: ${missing.join(", ")}` };
    }

    const writerRoleIds: string[] = [];
    const readerRoleIds: string[] = [];
    for (const perm of step.rolePermissions) {
      const roleName = perm.roleName.trim();
      if (roleName === "") continue;
      const roleId = roleNameToId.get(roleName);
      if (roleId === undefined) continue;
      (perm.canWrite ? writerRoleIds : readerRoleIds).push(roleId);
    }

    try {
      await ctx.discord.changeChannelPermissions({
        channelId: channel.id,
        writerRoleIds,
        readerRoleIds,
      });
      await ctx.resources.updateChannel(channel.id, { writerRoleIds, readerRoleIds });
      return { status: "success", message: `「${channel.name}」の権限を変更しました` };
    } catch {
      return { status: "error", message: "権限の変更に失敗しました" };
    }
  },
});
