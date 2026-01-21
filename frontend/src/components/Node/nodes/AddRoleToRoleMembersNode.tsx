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
  NODE_TYPE_WIDTHS,
} from "../base";
import { useNodeExecutionOptional } from "../contexts";
import { ResourceSelector } from "../utils";

export const DataSchema = BaseNodeDataSchema.extend({
  memberRoleName: z.string().trim(),
  addRoleName: z.string().trim(),
});
type AddRoleToRoleMembersNodeData = Node<z.infer<typeof DataSchema>, "AddRoleToRoleMembers">;

export const AddRoleToRoleMembersNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<AddRoleToRoleMembersNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const handleMemberRoleNameChange = (newValue: string) => {
    updateNodeData(id, { memberRoleName: newValue });
  };

  const handleAddRoleNameChange = (newValue: string) => {
    updateNodeData(id, { addRoleName: newValue });
  };

  const handleExecute = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, sessionId, bot } = executionContext;
    const memberRoleName = data.memberRoleName.trim();
    const addRoleName = data.addRoleName.trim();

    if (memberRoleName === "") {
      addToast({ message: "対象メンバーのロール名を入力してください", status: "warning" });
      return;
    }

    if (addRoleName === "") {
      addToast({ message: "付与するロール名を入力してください", status: "warning" });
      return;
    }

    setIsLoading(true);

    try {
      const roles = await db.Role.where("sessionId").equals(sessionId).toArray();

      const memberRole = roles.find((role) => role.name === memberRoleName);
      if (!memberRole) {
        addToast({
          message: `ロール「${memberRoleName}」がセッション内に存在しません`,
          status: "error",
        });
        setIsLoading(false);
        return;
      }

      const addRole = roles.find((role) => role.name === addRoleName);
      if (!addRole) {
        addToast({
          message: `ロール「${addRoleName}」がセッション内に存在しません`,
          status: "error",
        });
        setIsLoading(false);
        return;
      }

      const client = new ApiClient(bot.token);
      await client.addRoleToRoleMembers({
        guildId,
        memberRoleId: memberRole.id,
        addRoleId: addRole.id,
      });

      addToast({
        message: `ロール「${memberRoleName}」のメンバーに「${addRoleName}」を付与しました`,
        status: "success",
        durationSeconds: 5,
      });
      updateNodeData(id, { executedAt: new Date() });
    } catch (error) {
      addToast({
        message: error instanceof Error ? error.message : "ロールの付与に失敗しました",
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
      width={NODE_TYPE_WIDTHS.AddRoleToRoleMembers}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>ロールメンバーにロールを付与</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <div className="mb-2">
          <label className="label py-1">
            <span className="label-text text-xs">対象メンバーのロール名</span>
          </label>
          <ResourceSelector
            nodeId={id}
            resourceType="role"
            value={data.memberRoleName}
            onChange={handleMemberRoleNameChange}
            placeholder="例: プレイヤー"
            disabled={isExecuteMode || isLoading || isExecuted}
          />
        </div>
        <div>
          <label className="label py-1">
            <span className="label-text text-xs">付与するロール名</span>
          </label>
          <ResourceSelector
            nodeId={id}
            resourceType="role"
            value={data.addRoleName}
            onChange={handleAddRoleNameChange}
            placeholder="例: 参加者"
            disabled={isExecuteMode || isLoading || isExecuted}
          />
        </div>
      </BaseNodeContent>
      {isExecuteMode && (
        <BaseNodeFooter>
          <button
            type="button"
            className="nodrag btn btn-primary"
            onClick={handleExecute}
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
