import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import z from "zod";

import { ApiClient } from "@/api";
import { db } from "@/db";
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
  BaseNodeDataSchema,
  NODE_CONTENT_HEIGHTS,
  NODE_TYPE_WIDTHS,
} from "../base";
import { useNodeExecutionOptional } from "../contexts";

export const DataSchema = BaseNodeDataSchema.extend({
  roles: z.array(z.string().nonempty().trim()),
});
type CreateRoleNodeData = Node<z.infer<typeof DataSchema>, "CreateRole">;

export const CreateRoleNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<CreateRoleNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleRoleChange = (index: number, newValue: string) => {
    const updatedRoles = [...data.roles];
    updatedRoles[index] = newValue;
    updateNodeData(id, { roles: updatedRoles });
  };

  const handleAddRole = () => {
    updateNodeData(id, { roles: [...data.roles, ""] });
  };

  const handleRemoveRole = (index: number) => {
    const updatedRoles = data.roles.filter((_, i) => i !== index);
    updateNodeData(id, { roles: updatedRoles });
  };

  const handleCreateRoles = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, sessionId, bot } = executionContext;
    const validRoles = data.roles.filter((role) => role.trim() !== "");

    if (validRoles.length === 0) {
      addToast({ message: "作成するロールがありません", status: "warning" });
      return;
    }

    setIsLoading(true);
    setProgress({ current: 0, total: validRoles.length });

    const client = new ApiClient(bot.token);
    let successCount = 0;

    for (let i = 0; i < validRoles.length; i++) {
      setProgress({ current: i + 1, total: validRoles.length });
      try {
        const role = await client.createRole({ guildId, name: validRoles[i] });
        await db.Role.add({ id: role.id, guildId, sessionId, name: role.name });
        successCount++;
      } catch {
        addToast({
          message: `ロール「${validRoles[i]}」の作成に失敗しました`,
          status: "error",
        });
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      addToast({
        message: `${successCount}件のロールを作成しました`,
        status: "success",
        durationSeconds: 5,
      });
      if (successCount === validRoles.length) {
        updateNodeData(id, { executedAt: new Date() });
      }
    }
  };

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.CreateRole}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>ロールを作成する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        {data.roles.map((role, index) => (
          <div key={`${id}-role-${index}`} className="flex gap-2 items-center mb-2">
            <input
              type="text"
              className="nodrag input input-bordered w-full"
              value={role}
              onChange={(evt) => handleRoleChange(index, evt.target.value)}
              placeholder="ロール名を入力"
              disabled={isExecuteMode || isLoading || isExecuted}
            />
            {!isExecuteMode && (
              <button
                type="button"
                className="nodrag btn btn-ghost btn-sm"
                onClick={() => handleRemoveRole(index)}
              >
                削除
              </button>
            )}
          </div>
        ))}
        {!isExecuteMode && (
          <button
            type="button"
            className="nodrag btn btn-ghost btn-sm mt-2"
            onClick={handleAddRole}
          >
            ロールを追加
          </button>
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
            className="nodrag btn btn-primary"
            onClick={handleCreateRoles}
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
