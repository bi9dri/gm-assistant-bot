import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import z from "zod";

import { ApiClient } from "@/api";
import { db, type ChannelData } from "@/db";
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
import { ResourceSelector } from "../utils";

export const DataSchema = BaseNodeDataSchema.extend({
  channelNames: z.array(z.string().trim()),
});
type DeleteChannelNodeData = Node<z.infer<typeof DataSchema>, "DeleteChannel">;

export const DeleteChannelNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<DeleteChannelNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleChannelNameChange = (index: number, newValue: string) => {
    const updatedNames = [...data.channelNames];
    updatedNames[index] = newValue;
    updateNodeData(id, { channelNames: updatedNames });
  };

  const handleAddChannelName = () => {
    updateNodeData(id, { channelNames: [...data.channelNames, ""] });
  };

  const handleRemoveChannelName = (index: number) => {
    const updatedNames = data.channelNames.filter((_, i) => i !== index);
    updateNodeData(id, { channelNames: updatedNames });
  };

  const handleDeleteChannels = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { guildId, sessionId, bot } = executionContext;
    const validNames = data.channelNames.filter((name) => name.trim() !== "");

    if (validNames.length === 0) {
      addToast({ message: "チャンネル名を入力してください", status: "warning" });
      return;
    }

    const sessionChannels = await db.Channel.where("sessionId").equals(sessionId).toArray();

    const notFoundNames: string[] = [];
    const targetChannels: ChannelData[] = [];

    for (const name of validNames) {
      const found = sessionChannels.find((ch) => ch.name === name);
      if (!found) {
        notFoundNames.push(name);
      } else {
        targetChannels.push(found);
      }
    }

    // If any channel is not found, show error and abort
    if (notFoundNames.length > 0) {
      addToast({
        message: `チャンネルが見つかりません: ${notFoundNames.join(", ")}`,
        status: "error",
      });
      return;
    }

    setIsLoading(true);
    setProgress({ current: 0, total: targetChannels.length });

    const client = new ApiClient(bot.token);
    let successCount = 0;

    for (let i = 0; i < targetChannels.length; i++) {
      setProgress({ current: i + 1, total: targetChannels.length });
      const channel = targetChannels[i];
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

    setIsLoading(false);

    if (successCount > 0) {
      addToast({
        message: `${successCount}件のチャンネルを削除しました`,
        status: "success",
        durationSeconds: 5,
      });
      if (successCount === targetChannels.length) {
        updateNodeData(id, { executedAt: new Date() });
      }
    }
  };

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.DeleteChannel}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>チャンネルを削除する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        {data.channelNames.map((name, index) => (
          <div key={`${id}-channel-${index}`} className="flex gap-2 items-center mb-2">
            <div className="flex-1">
              <ResourceSelector
                nodeId={id}
                resourceType="channel"
                value={name}
                onChange={(newName) => handleChannelNameChange(index, newName)}
                placeholder="チャンネル名を入力"
                disabled={isExecuteMode || isLoading || isExecuted}
              />
            </div>
            {!isExecuteMode && (
              <button
                type="button"
                className="nodrag btn btn-ghost btn-sm"
                onClick={() => handleRemoveChannelName(index)}
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
            onClick={handleAddChannelName}
          >
            チャンネルを追加
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
      <BaseNodeFooter>
        <button
          type="button"
          className="nodrag btn btn-error"
          onClick={handleDeleteChannels}
          disabled={!isExecuteMode || isLoading || !!data.executedAt}
        >
          {isLoading && <span className="loading loading-spinner loading-sm"></span>}
          削除
        </button>
      </BaseNodeFooter>
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
