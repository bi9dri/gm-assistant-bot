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
} from "./base-node";
import { useNodeExecutionOptional } from "./NodeExecutionContext";

export const DataSchema = z.object({
  deleteAll: z.boolean(),
  selectedRoleIds: z.array(z.string()),
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

  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (executionContext) {
      void db.Role.where("sessionId").equals(executionContext.sessionId).toArray().then(setRoles);
    }
  }, [executionContext]);

  const handleDeleteAllChange = (checked: boolean) => {
    updateNodeData(id, { deleteAll: checked, selectedRoleIds: [] });
  };

  const handleRoleToggle = (roleId: string) => {
    const newSelectedIds = data.selectedRoleIds.includes(roleId)
      ? data.selectedRoleIds.filter((id) => id !== roleId)
      : [...data.selectedRoleIds, roleId];
    updateNodeData(id, { selectedRoleIds: newSelectedIds });
  };

  const handleDeleteRoles = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, bot } = executionContext;
    const targetRoles = data.deleteAll
      ? roles
      : roles.filter((r) => data.selectedRoleIds.includes(r.id));

    if (targetRoles.length === 0) {
      addToast({ message: "削除するロールがありません", status: "warning" });
      return;
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
      // Refresh roles list
      void db.Role.where("sessionId").equals(executionContext.sessionId).toArray().then(setRoles);
    }
  };

  const isExecuteMode = mode === "execute";

  return (
    <BaseNode className="bg-base-300">
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
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {roles.length === 0 ? (
              <p className="text-sm text-base-content/60">
                {isExecuteMode ? "削除可能なロールがありません" : "実行モードで表示されます"}
              </p>
            ) : (
              roles.map((role) => (
                <label key={role.id} className="label cursor-pointer justify-start gap-2 py-1">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={data.selectedRoleIds.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                    disabled={isLoading}
                  />
                  <span className="label-text">{role.name}</span>
                </label>
              ))
            )}
          </div>
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
            disabled={isLoading || (!data.deleteAll && data.selectedRoleIds.length === 0)}
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
