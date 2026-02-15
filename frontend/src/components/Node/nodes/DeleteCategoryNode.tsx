import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import z from "zod";

import { ApiClient } from "@/api";
import { db, type CategoryData, type ChannelData } from "@/db";
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

export const DataSchema = BaseNodeDataSchema.extend({});
type DeleteCategoryNodeData = Node<z.infer<typeof DataSchema>, "DeleteCategory">;

export const DeleteCategoryNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<DeleteCategoryNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (executionContext) {
      void db.Category.where("sessionId")
        .equals(executionContext.sessionId)
        .toArray()
        .then(setCategories);
      void db.Channel.where("sessionId")
        .equals(executionContext.sessionId)
        .toArray()
        .then(setChannels);
    }
  }, [executionContext]);

  const handleDelete = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, bot } = executionContext;

    // If no categories exist, mark as executed and return silently
    if (categories.length === 0) {
      updateNodeData(id, { executedAt: new Date() });
      return;
    }

    setIsLoading(true);
    const totalItems = channels.length + categories.length;
    setProgress({ current: 0, total: totalItems });

    const client = new ApiClient(bot.token);
    let successCount = 0;
    let currentProgress = 0;

    for (const channel of channels) {
      currentProgress++;
      setProgress({ current: currentProgress, total: totalItems });
      try {
        await client.deleteChannel({ guildId, channelId: channel.id });
        await db.Channel.delete(channel.id);
        successCount++;
      } catch {
        addToast({
          message: `チャンネル「${channel.name}」の削除に失敗しました`,
          status: "error",
        });
      }
    }

    for (const category of categories) {
      currentProgress++;
      setProgress({ current: currentProgress, total: totalItems });
      try {
        await client.deleteChannel({ guildId, channelId: category.id });
        await db.Category.delete(category.id);
        successCount++;
      } catch {
        addToast({
          message: `カテゴリ「${category.name}」の削除に失敗しました`,
          status: "error",
        });
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      addToast({
        message: `${successCount}件のリソースを削除しました`,
        status: "success",
        durationSeconds: 5,
      });
      if (successCount === totalItems) {
        updateNodeData(id, { executedAt: new Date() });
      }
      void db.Category.where("sessionId")
        .equals(executionContext.sessionId)
        .toArray()
        .then(setCategories);
      void db.Channel.where("sessionId")
        .equals(executionContext.sessionId)
        .toArray()
        .then(setChannels);
    }
  };

  const isExecuteMode = mode === "execute";
  const totalItems = channels.length + categories.length;

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.DeleteCategory}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>カテゴリを削除する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <p className="text-sm text-base-content/60">
          {isExecuteMode
            ? totalItems > 0
              ? `${categories.length}件のカテゴリと${channels.length}件のチャンネルを削除します`
              : "削除対象がありません"
            : "セッション内のカテゴリとチャンネルを削除します"}
        </p>

        {isLoading && (
          <div className="mt-2">
            <progress
              className="progress progress-error w-full"
              value={progress.current}
              max={progress.total}
            />
            <p className="text-sm text-center mt-1">
              {progress.current} / {progress.total}
            </p>
          </div>
        )}
      </BaseNodeContent>
      <BaseNodeFooter>
        <button
          type="button"
          className="btn btn-error"
          onClick={handleDelete}
          disabled={!isExecuteMode || isLoading || !!data.executedAt}
        >
          {isLoading && <span className="loading loading-spinner loading-sm"></span>}
          削除
        </button>
      </BaseNodeFooter>
      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
