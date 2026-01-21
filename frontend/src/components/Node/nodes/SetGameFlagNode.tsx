import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import z from "zod";

import { GameSession } from "@/db";
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

export const DataSchema = BaseNodeDataSchema.extend({
  flagKey: z.string().trim(),
  flagValue: z.string().trim(),
});

type SetGameFlagNodeData = Node<z.infer<typeof DataSchema>, "SetGameFlag">;

export const SetGameFlagNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<SetGameFlagNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const handleKeyChange = (newValue: string) => {
    updateNodeData(id, { flagKey: newValue });
  };

  const handleValueChange = (newValue: string) => {
    updateNodeData(id, { flagValue: newValue });
  };

  const handleSetFlag = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { sessionId } = executionContext;
    const key = data.flagKey.trim();
    const value = data.flagValue.trim();

    if (key === "") {
      addToast({ message: "フラグのKeyを入力してください", status: "warning" });
      return;
    }

    setIsLoading(true);

    try {
      const session = await GameSession.getById(sessionId);
      if (!session) {
        addToast({ message: "セッションが見つかりません", status: "error" });
        return;
      }

      const currentFlags = session.getParsedGameFlags();
      const updatedFlags = { ...currentFlags, [key]: value };

      await session.update({ gameFlags: updatedFlags });

      addToast({
        message: `フラグ「${key}」を設定しました`,
        status: "success",
        durationSeconds: 5,
      });

      updateNodeData(id, { executedAt: new Date() });
    } catch {
      addToast({
        message: `フラグ「${key}」の設定に失敗しました`,
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
      width={NODE_TYPE_WIDTHS.SetGameFlag}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>ゲームフラグを設定する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Key</span>
          </div>
          <input
            type="text"
            className="nodrag input input-bordered w-full"
            value={data.flagKey}
            onChange={(evt) => handleKeyChange(evt.target.value)}
            placeholder="例: アイテム入手, イベント発生済み"
            disabled={isExecuteMode || isLoading || isExecuted}
          />
        </label>
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Value</span>
          </div>
          <input
            type="text"
            className="nodrag input input-bordered w-full"
            value={data.flagValue}
            onChange={(evt) => handleValueChange(evt.target.value)}
            placeholder="例: 1, アイテム名"
            disabled={isExecuteMode || isLoading || isExecuted}
          />
        </label>
      </BaseNodeContent>
      {isExecuteMode && (
        <BaseNodeFooter>
          <button
            type="button"
            className="nodrag btn btn-primary"
            onClick={handleSetFlag}
            disabled={isLoading || isExecuted}
          >
            {isLoading && <span className="loading loading-spinner loading-sm"></span>}
            設定
          </button>
        </BaseNodeFooter>
      )}
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
