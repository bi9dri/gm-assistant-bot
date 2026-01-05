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
} from "./base-node";
import { BaseNodeDataSchema, NODE_TYPE_WIDTHS } from "./base-schema";
import { useNodeExecutionOptional } from "./NodeExecutionContext";

export const DataSchema = BaseNodeDataSchema.extend({
  categoryName: z.string().trim(),
});
type CreateCategoryNodeData = Node<z.infer<typeof DataSchema>, "CreateCategory">;

export const CreateCategoryNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<CreateCategoryNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const handleCategoryNameChange = (newValue: string) => {
    updateNodeData(id, { categoryName: newValue });
  };

  const handleCreateCategory = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, sessionId, bot } = executionContext;
    const categoryName = data.categoryName.trim();

    if (categoryName === "") {
      addToast({ message: "カテゴリ名を入力してください", status: "warning" });
      return;
    }

    setIsLoading(true);

    const client = new ApiClient(bot.token);

    try {
      const category = await client.createCategory({ guildId, name: categoryName });
      await db.Category.add({ id: category.id, sessionId, name: category.name });

      addToast({
        message: `カテゴリ「${category.name}」を作成しました`,
        status: "success",
        durationSeconds: 5,
      });
      updateNodeData(id, { executedAt: new Date() });
    } catch {
      addToast({
        message: `カテゴリ「${categoryName}」の作成に失敗しました`,
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isExecuteMode = mode === "execute";

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.CreateCategory}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>カテゴリを作成する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <input
          type="text"
          className="input input-bordered w-full"
          value={data.categoryName}
          onChange={(evt) => handleCategoryNameChange(evt.target.value)}
          placeholder="カテゴリ名を入力"
          disabled={isLoading}
        />
      </BaseNodeContent>
      {isExecuteMode && (
        <BaseNodeFooter>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateCategory}
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
