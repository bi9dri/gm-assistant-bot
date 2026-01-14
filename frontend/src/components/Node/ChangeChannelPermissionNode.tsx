import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import z from "zod";

import { ApiClient } from "@/api";
import { db, type ChannelData, type RoleData } from "@/db";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  cn,
} from "./base-node";
import { BaseNodeDataSchema, NODE_CONTENT_HEIGHTS, NODE_TYPE_WIDTHS } from "./base-schema";
import { useNodeExecutionOptional } from "./NodeExecutionContext";

const RolePermissionSchema = z.object({
  roleName: z.string().trim(),
  canWrite: z.boolean(),
});

export const DataSchema = BaseNodeDataSchema.extend({
  channelName: z.string().trim(),
  rolePermissions: z.array(RolePermissionSchema),
});
type ChangeChannelPermissionNodeData = Node<z.infer<typeof DataSchema>, "ChangeChannelPermission">;

type RolePermission = z.infer<typeof RolePermissionSchema>;

export const ChangeChannelPermissionNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<ChangeChannelPermissionNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [roles, setRoles] = useState<RoleData[]>([]);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (executionContext) {
      void db.Role.where("sessionId").equals(executionContext.sessionId).toArray().then(setRoles);
      void db.Channel.where("sessionId")
        .equals(executionContext.sessionId)
        .toArray()
        .then(setChannels);
    }
  }, [executionContext]);

  const handleChannelNameChange = (value: string) => {
    updateNodeData(id, { channelName: value });
  };

  const handleAddRolePermission = () => {
    updateNodeData(id, {
      rolePermissions: [...data.rolePermissions, { roleName: "", canWrite: false }],
    });
  };

  const handleRolePermissionChange = (
    roleIndex: number,
    field: keyof RolePermission,
    value: string | boolean,
  ) => {
    const newPermissions = [...data.rolePermissions];
    newPermissions[roleIndex] = { ...newPermissions[roleIndex], [field]: value };
    updateNodeData(id, { rolePermissions: newPermissions });
  };

  const handleRemoveRolePermission = (roleIndex: number) => {
    const newPermissions = data.rolePermissions.filter((_, i) => i !== roleIndex);
    updateNodeData(id, { rolePermissions: newPermissions });
  };

  const handleChangePermissions = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { bot } = executionContext;

    // Validate channel name
    if (data.channelName.trim() === "") {
      addToast({ message: "チャンネル名を入力してください", status: "warning" });
      return;
    }

    // Find channel by name
    const channel = channels.find((c) => c.name === data.channelName.trim());
    if (!channel) {
      addToast({
        message: `チャンネル「${data.channelName}」が見つかりません`,
        status: "error",
      });
      return;
    }

    // Resolve role names to IDs
    const roleNameToId = new Map<string, string>();
    for (const role of roles) {
      roleNameToId.set(role.name, role.id);
    }

    // Check for missing roles
    const missingRoles: string[] = [];
    for (const perm of data.rolePermissions) {
      if (perm.roleName.trim() !== "" && !roleNameToId.has(perm.roleName)) {
        missingRoles.push(perm.roleName);
      }
    }

    if (missingRoles.length > 0) {
      const uniqueMissing = [...new Set(missingRoles)];
      addToast({
        message: `ロールが見つかりません: ${uniqueMissing.join(", ")}`,
        status: "error",
      });
      return;
    }

    setIsLoading(true);

    // Convert role permissions to IDs
    const writerRoleIds: string[] = [];
    const readerRoleIds: string[] = [];

    for (const perm of data.rolePermissions) {
      if (perm.roleName.trim() === "") continue;
      const roleId = roleNameToId.get(perm.roleName)!;
      if (perm.canWrite) {
        writerRoleIds.push(roleId);
      } else {
        readerRoleIds.push(roleId);
      }
    }

    const client = new ApiClient(bot.token);

    try {
      await client.changeChannelPermissions({
        channelId: channel.id,
        writerRoleIds,
        readerRoleIds,
      });

      // Update local DB
      await db.Channel.update(channel.id, {
        writerRoleIds,
        readerRoleIds,
      });

      addToast({
        message: `チャンネル「${data.channelName}」の権限を変更しました`,
        status: "success",
        durationSeconds: 5,
      });
      updateNodeData(id, { executedAt: new Date() });
    } catch {
      addToast({
        message: `チャンネル「${data.channelName}」の権限変更に失敗しました`,
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.ChangeChannelPermission}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>チャンネル権限を変更する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        <div className="space-y-3">
          {/* Channel name input */}
          <input
            type="text"
            className="nodrag input input-bordered input-sm w-full"
            value={data.channelName}
            onChange={(evt) => handleChannelNameChange(evt.target.value)}
            placeholder="チャンネル名"
            disabled={isLoading || isExecuted}
          />

          {/* Warning message */}
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
            <span>
              既存の権限はすべて上書きされます。指定しなかったロールの権限は削除されます。
            </span>
          </div>

          {/* Role permissions */}
          <div className="space-y-1">
            <p className="text-xs font-semibold">ロール権限</p>
            {data.rolePermissions.map((perm, roleIndex) => (
              <div key={`${id}-role-${roleIndex}`} className="flex gap-2 items-center">
                <input
                  type="text"
                  className="nodrag input input-bordered input-xs flex-1"
                  value={perm.roleName}
                  onChange={(e) =>
                    handleRolePermissionChange(roleIndex, "roleName", e.target.value)
                  }
                  placeholder="ロール名"
                  disabled={isLoading || isExecuted}
                />
                <label className="nodrag flex items-center gap-1 cursor-pointer">
                  <span className="text-xs">読み取り</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-xs"
                    checked={perm.canWrite}
                    onChange={(e) =>
                      handleRolePermissionChange(roleIndex, "canWrite", e.target.checked)
                    }
                    disabled={isLoading || isExecuted}
                  />
                  <span className="text-xs">書き込み</span>
                </label>
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-xs"
                  onClick={() => handleRemoveRolePermission(roleIndex)}
                  disabled={isLoading || isExecuted}
                >
                  x
                </button>
              </div>
            ))}
            <button
              type="button"
              className="nodrag btn btn-ghost btn-xs"
              onClick={handleAddRolePermission}
              disabled={isLoading || isExecuted}
            >
              + ロールを追加
            </button>
          </div>

          {/* Show available roles and channels in execute mode */}
          {isExecuteMode && (roles.length > 0 || channels.length > 0) && (
            <div className="text-xs text-base-content/60 space-y-1">
              {channels.length > 0 && (
                <p>利用可能なチャンネル: {channels.map((c) => c.name).join(", ")}</p>
              )}
              {roles.length > 0 && <p>利用可能なロール: {roles.map((r) => r.name).join(", ")}</p>}
            </div>
          )}
        </div>
      </BaseNodeContent>
      {isExecuteMode && (
        <BaseNodeFooter>
          <button
            type="button"
            className="nodrag btn btn-primary"
            onClick={handleChangePermissions}
            disabled={isLoading || !!data.executedAt}
          >
            {isLoading && <span className="loading loading-spinner loading-sm"></span>}
            実行
          </button>
        </BaseNodeFooter>
      )}
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
