import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";
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

export const DataSchema = BaseNodeDataSchema.extend({
  deleteAll: z.boolean(),
  roleNames: z.array(z.string().trim()),
});
type DeleteRoleNodeData = Node<z.infer<typeof DataSchema>, "DeleteRole">;

export const DeleteRoleNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<DeleteRoleNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleDeleteAllChange = (checked: boolean) => {
    updateNodeData(id, { deleteAll: checked });
  };

  const handleRoleNameChange = (index: number, newValue: string) => {
    const updatedNames = [...data.roleNames];
    updatedNames[index] = newValue;
    updateNodeData(id, { roleNames: updatedNames });
  };

  const handleAddRoleName = () => {
    updateNodeData(id, { roleNames: [...data.roleNames, ""] });
  };

  const handleRemoveRoleName = (index: number) => {
    const updatedNames = data.roleNames.filter((_, i) => i !== index);
    updateNodeData(id, { roleNames: updatedNames });
  };

  const handleDeleteRoles = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, sessionId, bot } = executionContext;

    // Get session roles from DB
    const sessionRoles = await db.Role.where("sessionId").equals(sessionId).toArray();

    let targetRoles: RoleData[];

    if (data.deleteAll) {
      // Delete all roles in session
      if (sessionRoles.length === 0) {
        addToast({ message: "削除するロールがありません", status: "warning" });
        return;
      }
      targetRoles = sessionRoles;
    } else {
      // Delete by name match
      const validNames = data.roleNames.filter((name) => name.trim() !== "");

      if (validNames.length === 0) {
        addToast({ message: "ロール名を入力してください", status: "warning" });
        return;
      }

      // Find roles by exact name match
      const notFoundNames: string[] = [];
      targetRoles = [];

      for (const name of validNames) {
        const found = sessionRoles.find((r) => r.name === name);
        if (!found) {
          notFoundNames.push(name);
        } else {
          targetRoles.push(found);
        }
      }

      // If any role is not found, show error and abort
      if (notFoundNames.length > 0) {
        addToast({
          message: `ロールが見つかりません: ${notFoundNames.join(", ")}`,
          status: "error",
        });
        return;
      }
    }

    setIsLoading(true);
    setProgress({ current: 0, total: targetRoles.length });

    const client = new DiscordClient(bot.token);
    let successCount = 0;

    for (let i = 0; i < targetRoles.length; i++) {
      setProgress({ current: i + 1, total: targetRoles.length });
      const role = targetRoles[i];
      try {
        await client.deleteRole({ guildId, roleId: role.id });
        await db.Role.delete([role.id, guildId]);
        successCount++;
      } catch {
        addToast({
          message: `ロール「${role.name}」の削除に失敗しました`,
          status: "error",
        });
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      addToast({
        message: `${successCount}件のロールを削除しました`,
        status: "success",
        durationSeconds: 5,
      });
      if (successCount === targetRoles.length) {
        updateNodeData(id, { executedAt: new Date() });
      }
    }
  };

  const isExecuteMode = mode === "execute";

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.DeleteRole}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>ロールを削除する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <div className="form-control mb-2">
          <label className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={data.deleteAll}
              onChange={(e) => handleDeleteAllChange(e.target.checked)}
              disabled={isLoading}
            />
            <span className="label-text">すべて削除</span>
          </label>
        </div>

        {!data.deleteAll && (
          <>
            {data.roleNames.map((name, index) => (
              <div key={`${id}-role-${index}`} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={name}
                  onChange={(evt) => handleRoleNameChange(index, evt.target.value)}
                  placeholder="ロール名を入力"
                  disabled={isLoading}
                />
                {!isExecuteMode && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemoveRoleName(index)}
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
            {!isExecuteMode && (
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-2"
                onClick={handleAddRoleName}
              >
                ロールを追加
              </button>
            )}
          </>
        )}

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
            className="btn btn-error"
            onClick={handleDeleteRoles}
            disabled={isLoading || !!data.executedAt}
          >
            {isLoading && <span className="loading loading-spinner loading-sm"></span>}
            削除
          </button>
        </BaseNodeFooter>
      )}
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
