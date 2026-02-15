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
  NODE_CONTENT_HEIGHTS,
  NODE_TYPE_WIDTHS,
} from "../base";
import { useNodeExecutionOptional } from "../contexts";
import { fisherYatesShuffle } from "../utils";

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().trim().min(1),
  items: z.array(z.string().min(1)).min(1),
  targets: z.array(z.string().min(1)).min(1),
  resultFlagPrefix: z.string().trim().min(1),
  assignedResults: z.record(z.string(), z.array(z.string())).optional(),
});

type ShuffleAssignNodeData = Node<z.infer<typeof DataSchema>, "ShuffleAssign">;

export const ShuffleAssignNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<ShuffleAssignNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const handleTitleChange = (newValue: string) => {
    updateNodeData(id, { title: newValue });
  };

  const handleItemChange = (index: number, newValue: string) => {
    const updatedItems = [...data.items];
    updatedItems[index] = newValue;
    updateNodeData(id, { items: updatedItems });
  };

  const handleAddItem = () => {
    updateNodeData(id, { items: [...data.items, ""] });
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = data.items.filter((_, i) => i !== index);
    updateNodeData(id, { items: updatedItems });
  };

  const handleTargetChange = (index: number, newValue: string) => {
    const updatedTargets = [...data.targets];
    updatedTargets[index] = newValue;
    updateNodeData(id, { targets: updatedTargets });
  };

  const handleAddTarget = () => {
    updateNodeData(id, { targets: [...data.targets, ""] });
  };

  const handleRemoveTarget = (index: number) => {
    const updatedTargets = data.targets.filter((_, i) => i !== index);
    updateNodeData(id, { targets: updatedTargets });
  };

  const handleResultFlagPrefixChange = (newValue: string) => {
    updateNodeData(id, { resultFlagPrefix: newValue });
  };

  const handleShuffle = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { sessionId } = executionContext;
    const validItems = data.items.filter((item) => item.trim() !== "");
    const validTargets = data.targets.filter((target) => target.trim() !== "");

    if (validItems.length === 0 || validTargets.length === 0) {
      addToast({ message: "項目と対象を入力してください", status: "warning" });
      return;
    }

    if (data.resultFlagPrefix.trim() === "") {
      addToast({ message: "フラグのプレフィックスを入力してください", status: "warning" });
      return;
    }

    setIsLoading(true);

    try {
      const session = await GameSession.getById(sessionId);
      if (!session) {
        addToast({ message: "セッションが見つかりません", status: "error" });
        return;
      }

      const shuffledItems = fisherYatesShuffle(validItems);
      const shuffledTargets = fisherYatesShuffle(validTargets);
      const assignedResults: Record<string, string[]> = {};

      shuffledTargets.forEach((target) => {
        assignedResults[target] = [];
      });

      shuffledItems.forEach((item, index) => {
        const targetIndex = index % shuffledTargets.length;
        const target = shuffledTargets[targetIndex];
        assignedResults[target].push(item);
      });

      const currentFlags = session.getParsedGameFlags();
      const updatedFlags = { ...currentFlags };

      Object.entries(assignedResults).forEach(([target, items]) => {
        if (items.length > 0) {
          const flagKey = `${data.resultFlagPrefix}_${target}`;
          updatedFlags[flagKey] = items.join(", ");
        }
      });

      await session.update({ gameFlags: updatedFlags });

      addToast({
        message: "シャッフル割り当てが完了しました",
        status: "success",
        durationSeconds: 5,
      });

      updateNodeData(id, {
        assignedResults,
        executedAt: new Date(),
      });
    } catch {
      addToast({
        message: "シャッフル割り当てに失敗しました",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;
  const itemsCount = data.items.filter((item) => item.trim() !== "").length;
  const targetsCount = data.targets.filter((target) => target.trim() !== "").length;

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.ShuffleAssign}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>
          {isExecuteMode && data.title ? data.title : "シャッフル割り当て"}
        </BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.lg}>
        {!isExecuteMode && (
          <label className="form-control w-full mb-3">
            <div className="label">
              <span className="label-text">タイトル</span>
            </div>
            <input
              type="text"
              className="nodrag input input-bordered w-full"
              value={data.title}
              onChange={(evt) => handleTitleChange(evt.target.value)}
              placeholder="例: ランダム配布"
              disabled={isLoading || isExecuted}
            />
          </label>
        )}

        {!isExecuteMode && (
          <label className="form-control w-full mb-3">
            <div className="label">
              <span className="label-text">フラグのプレフィックス</span>
            </div>
            <input
              type="text"
              className="nodrag input input-bordered w-full"
              value={data.resultFlagPrefix}
              onChange={(evt) => handleResultFlagPrefixChange(evt.target.value)}
              placeholder="例: 没情報"
              disabled={isLoading || isExecuted}
            />
          </label>
        )}

        <div className="mb-3">
          <div className="label">
            <span className="label-text font-semibold">配布項目 ({itemsCount})</span>
          </div>
          {data.items.map((item, index) => (
            <div key={`${id}-item-${index}`} className="flex gap-2 items-center mb-2">
              <input
                type="text"
                className="nodrag input input-bordered input-sm w-full"
                value={item}
                onChange={(evt) => handleItemChange(index, evt.target.value)}
                placeholder="項目名を入力"
                disabled={isExecuteMode || isLoading || isExecuted}
              />
              {!isExecuteMode && (
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-sm"
                  onClick={() => handleRemoveItem(index)}
                >
                  削除
                </button>
              )}
            </div>
          ))}
          {!isExecuteMode && (
            <button
              type="button"
              className="nodrag btn btn-ghost btn-sm mt-1"
              onClick={handleAddItem}
            >
              項目を追加
            </button>
          )}
        </div>

        <div className="mb-3">
          <div className="label">
            <span className="label-text font-semibold">割り当て対象 ({targetsCount})</span>
          </div>
          {data.targets.map((target, index) => (
            <div key={`${id}-target-${index}`} className="flex gap-2 items-center mb-2">
              <input
                type="text"
                className="nodrag input input-bordered input-sm w-full"
                value={target}
                onChange={(evt) => handleTargetChange(index, evt.target.value)}
                placeholder="対象名を入力"
                disabled={isExecuteMode || isLoading || isExecuted}
              />
              {!isExecuteMode && (
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-sm"
                  onClick={() => handleRemoveTarget(index)}
                >
                  削除
                </button>
              )}
            </div>
          ))}
          {!isExecuteMode && (
            <button
              type="button"
              className="nodrag btn btn-ghost btn-sm mt-1"
              onClick={handleAddTarget}
            >
              対象を追加
            </button>
          )}
        </div>

        {!isExecuteMode && itemsCount !== targetsCount && (
          <div className="alert alert-info text-sm">
            <span>
              {itemsCount > targetsCount
                ? "項目が多いため、一部の対象に複数の項目が割り当てられます"
                : "項目が少ないため、一部の対象には何も割り当てられません"}
            </span>
          </div>
        )}

        {isExecuteMode && data.assignedResults && (
          <div className="mt-3">
            <div className="label">
              <span className="label-text font-semibold">割り当て結果</span>
            </div>
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>対象</th>
                  <th>項目</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.assignedResults).map(([target, items]) => (
                  <tr key={target}>
                    <td>{target}</td>
                    <td>{items.length > 0 ? items.join(", ") : "なし"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BaseNodeContent>
      <BaseNodeFooter>
        <button
          type="button"
          className="nodrag btn btn-primary"
          onClick={handleShuffle}
          disabled={!isExecuteMode || isLoading || isExecuted}
        >
          {isLoading && <span className="loading loading-spinner loading-sm"></span>}
          シャッフル実行
        </button>
      </BaseNodeFooter>
      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
