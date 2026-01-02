import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import z from "zod";

import { db, type RoleData } from "@/db";
import { DiscordClient } from "@/discord";
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
import { BaseNodeDataSchema, NODE_TYPE_WIDTHS } from "./base-schema";
import { useNodeExecutionOptional } from "./NodeExecutionContext";

const RolePermissionSchema = z.object({
  roleName: z.string().trim(),
  canWrite: z.boolean(),
});

const ChannelItemSchema = z.object({
  name: z.string().trim(),
  type: z.enum(["text", "voice"]),
  rolePermissions: z.array(RolePermissionSchema),
});

export const DataSchema = BaseNodeDataSchema.extend({
  channels: z.array(ChannelItemSchema),
});
type CreateChannelNodeData = Node<z.infer<typeof DataSchema>, "CreateChannel">;

type ChannelItem = z.infer<typeof ChannelItemSchema>;
type RolePermission = z.infer<typeof RolePermissionSchema>;

export const CreateChannelNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<CreateChannelNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (executionContext) {
      void db.Role.where("sessionId").equals(executionContext.sessionId).toArray().then(setRoles);
    }
  }, [executionContext]);

  const handleChannelChange = (
    index: number,
    field: keyof ChannelItem,
    value: ChannelItem[keyof ChannelItem],
  ) => {
    const updatedChannels = [...data.channels];
    updatedChannels[index] = { ...updatedChannels[index], [field]: value };
    updateNodeData(id, { channels: updatedChannels });
  };

  const handleAddChannel = () => {
    updateNodeData(id, {
      channels: [...data.channels, { name: "", type: "text", rolePermissions: [] }],
    });
  };

  const handleRemoveChannel = (index: number) => {
    const updatedChannels = data.channels.filter((_, i) => i !== index);
    updateNodeData(id, { channels: updatedChannels });
  };

  const handleAddRolePermission = (channelIndex: number) => {
    const channel = data.channels[channelIndex];
    const newPermissions = [...channel.rolePermissions, { roleName: "", canWrite: false }];
    handleChannelChange(channelIndex, "rolePermissions", newPermissions);
  };

  const handleRolePermissionChange = (
    channelIndex: number,
    roleIndex: number,
    field: keyof RolePermission,
    value: string | boolean,
  ) => {
    const channel = data.channels[channelIndex];
    const newPermissions = [...channel.rolePermissions];
    newPermissions[roleIndex] = { ...newPermissions[roleIndex], [field]: value };
    handleChannelChange(channelIndex, "rolePermissions", newPermissions);
  };

  const handleRemoveRolePermission = (channelIndex: number, roleIndex: number) => {
    const channel = data.channels[channelIndex];
    const newPermissions = channel.rolePermissions.filter((_, i) => i !== roleIndex);
    handleChannelChange(channelIndex, "rolePermissions", newPermissions);
  };

  const handleCreateChannels = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, sessionId, bot } = executionContext;

    // Check if category exists
    const category = await db.Category.where("sessionId").equals(sessionId).first();
    if (!category) {
      addToast({
        message: "カテゴリが存在しません。先にカテゴリを作成してください。",
        status: "error",
      });
      return;
    }

    const validChannels = data.channels.filter((channel) => channel.name.trim() !== "");

    if (validChannels.length === 0) {
      addToast({ message: "作成するチャンネルがありません", status: "warning" });
      return;
    }

    // Resolve role names to IDs
    const roleNameToId = new Map<string, string>();
    for (const role of roles) {
      roleNameToId.set(role.name, role.id);
    }

    // Check for missing roles
    const missingRoles: string[] = [];
    for (const channel of validChannels) {
      for (const perm of channel.rolePermissions) {
        if (perm.roleName.trim() !== "" && !roleNameToId.has(perm.roleName)) {
          missingRoles.push(perm.roleName);
        }
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
    setProgress({ current: 0, total: validChannels.length });

    const client = new DiscordClient(bot.token);
    let successCount = 0;

    for (let i = 0; i < validChannels.length; i++) {
      setProgress({ current: i + 1, total: validChannels.length });
      const channelData = validChannels[i];

      // Convert role permissions to IDs
      const writerRoleIds: string[] = [];
      const readerRoleIds: string[] = [];

      for (const perm of channelData.rolePermissions) {
        if (perm.roleName.trim() === "") continue;
        const roleId = roleNameToId.get(perm.roleName)!;
        if (perm.canWrite) {
          writerRoleIds.push(roleId);
        } else {
          readerRoleIds.push(roleId);
        }
      }

      try {
        const channel = await client.createChannel({
          guildId,
          parentCategoryId: category.id,
          name: channelData.name,
          type: channelData.type,
          writerRoleIds,
          readerRoleIds,
        });
        await db.Channel.add({
          id: channel.id,
          sessionId,
          name: channel.name,
          type: channelData.type,
          writerRoleIds,
          readerRoleIds,
        });
        successCount++;
      } catch {
        addToast({
          message: `チャンネル「${channelData.name}」の作成に失敗しました`,
          status: "error",
        });
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      addToast({
        message: `${successCount}件のチャンネルを作成しました`,
        status: "success",
        durationSeconds: 5,
      });
      if (successCount === validChannels.length) {
        updateNodeData(id, { executedAt: new Date() });
      }
    }
  };

  const isExecuteMode = mode === "execute";

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.CreateChannel}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>チャンネルを作成する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <div className="space-y-4">
          {data.channels.map((channel, channelIndex) => (
            <div
              key={`${id}-channel-${channelIndex}`}
              className="border border-base-content/20 rounded-lg p-3"
            >
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  value={channel.name}
                  onChange={(evt) => handleChannelChange(channelIndex, "name", evt.target.value)}
                  placeholder="チャンネル名"
                  disabled={isLoading}
                />
                <label className="flex items-center gap-1 cursor-pointer">
                  <span className="text-xs">テキスト</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={channel.type === "voice"}
                    onChange={(e) =>
                      handleChannelChange(channelIndex, "type", e.target.checked ? "voice" : "text")
                    }
                    disabled={isLoading}
                  />
                  <span className="text-xs">ボイス</span>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleRemoveChannel(channelIndex)}
                  disabled={isLoading}
                >
                  削除
                </button>
              </div>

              {/* Role permissions */}
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold">ロール権限</p>
                {channel.rolePermissions.map((perm, roleIndex) => (
                  <div
                    key={`${id}-channel-${channelIndex}-role-${roleIndex}`}
                    className="flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      className="input input-bordered input-xs flex-1"
                      value={perm.roleName}
                      onChange={(e) =>
                        handleRolePermissionChange(
                          channelIndex,
                          roleIndex,
                          "roleName",
                          e.target.value,
                        )
                      }
                      placeholder="ロール名"
                      disabled={isLoading}
                    />
                    <label className="flex items-center gap-1 cursor-pointer">
                      <span className="text-xs">読み取り</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-xs"
                        checked={perm.canWrite}
                        onChange={(e) =>
                          handleRolePermissionChange(
                            channelIndex,
                            roleIndex,
                            "canWrite",
                            e.target.checked,
                          )
                        }
                        disabled={isLoading}
                      />
                      <span className="text-xs">書き込み</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleRemoveRolePermission(channelIndex, roleIndex)}
                      disabled={isLoading}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleAddRolePermission(channelIndex)}
                  disabled={isLoading}
                >
                  + ロールを追加
                </button>
              </div>

              {/* Show available roles in execute mode */}
              {isExecuteMode && roles.length > 0 && (
                <p className="text-xs text-base-content/60 mt-2">
                  利用可能なロール: {roles.map((r) => r.name).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm mt-2"
          onClick={handleAddChannel}
          disabled={isLoading}
        >
          チャンネルを追加
        </button>

        {isLoading && (
          <div className="mt-2">
            <progress
              className="progress progress-primary w-full"
              value={progress.current}
              max={progress.total}
            />
            <p className="text-sm text-center mt-1">
              {progress.current} / {progress.total}
            </p>
          </div>
        )}
      </BaseNodeContent>
      {isExecuteMode && (
        <BaseNodeFooter>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateChannels}
            disabled={isLoading || !!data.executedAt}
          >
            {isLoading && <span className="loading loading-spinner loading-sm"></span>}
            作成
          </button>
        </BaseNodeFooter>
      )}
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
