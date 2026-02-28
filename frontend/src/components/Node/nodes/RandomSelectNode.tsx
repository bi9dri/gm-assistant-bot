import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { HiPencil } from "react-icons/hi";
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
  resultFlagKey: z.string().trim().min(1),
  selectedItem: z.string().optional(),
});

type RandomSelectNodeData = Node<z.infer<typeof DataSchema>, "RandomSelect">;

interface EditableTitleProps {
  title: string;
  defaultTitle: string;
  onTitleChange: (newTitle: string) => void;
}

function EditableTitle({ title, defaultTitle, onTitleChange }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const handleConfirm = () => {
    onTitleChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          ref={inputRef}
          type="text"
          className="nodrag input input-bordered input-xs flex-1 font-semibold"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleConfirm}
          placeholder={defaultTitle}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <span className="font-semibold truncate">{title || defaultTitle}</span>
      <button
        type="button"
        className="nodrag btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100 shrink-0"
        onClick={handleStartEdit}
        title="ノード名を編集"
      >
        <HiPencil className="w-3 h-3" />
      </button>
    </div>
  );
}

export const RandomSelectNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<RandomSelectNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const handleTitleChange = (newValue: string) => {
    updateNodeData(id, { title: newValue });
  };

  const handleResultFlagKeyChange = (newValue: string) => {
    updateNodeData(id, { resultFlagKey: newValue });
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

  const handleRandomSelect = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { sessionId } = executionContext;
    const validItems = data.items.filter((item) => item.trim() !== "");

    if (validItems.length === 0) {
      addToast({ message: "候補を入力してください", status: "warning" });
      return;
    }

    if (data.resultFlagKey.trim() === "") {
      addToast({ message: "フラグキーを入力してください", status: "warning" });
      return;
    }

    setIsLoading(true);

    try {
      const session = await GameSession.getById(sessionId);
      if (!session) {
        addToast({ message: "セッションが見つかりません", status: "error" });
        return;
      }

      const shuffled = fisherYatesShuffle(validItems);
      const selected = shuffled[0];

      const currentFlags = session.getParsedGameFlags();
      await session.update({
        gameFlags: { ...currentFlags, [data.resultFlagKey]: selected },
      });

      addToast({
        message: "ランダム選択が完了しました",
        status: "success",
        durationSeconds: 5,
      });

      updateNodeData(id, {
        selectedItem: selected,
        executedAt: new Date(),
      });
    } catch {
      addToast({
        message: "ランダム選択に失敗しました",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;
  const itemsCount = data.items.filter((item) => item.trim() !== "").length;

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.RandomSelect}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>{data.title || "ランダム選択"}</BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="ランダム選択"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        {!isExecuteMode && (
          <label className="form-control w-full mb-3">
            <div className="label">
              <span className="label-text">フラグキー</span>
            </div>
            <input
              type="text"
              className="nodrag input input-bordered w-full"
              value={data.resultFlagKey}
              onChange={(evt) => handleResultFlagKeyChange(evt.target.value)}
              placeholder="例: 犯人"
              disabled={isLoading || isExecuted}
            />
          </label>
        )}

        <div className="mb-3">
          <div className="label">
            <span className="label-text font-semibold">候補 ({itemsCount})</span>
          </div>
          {data.items.map((item, index) => (
            <div key={`${id}-item-${index}`} className="flex gap-2 items-center mb-2">
              <input
                type="text"
                className="nodrag input input-bordered input-sm w-full"
                value={item}
                onChange={(evt) => handleItemChange(index, evt.target.value)}
                placeholder="候補名を入力"
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
              候補を追加
            </button>
          )}
        </div>

        {isExecuteMode && data.selectedItem && (
          <div className="mt-3 p-3 rounded-box bg-success/20">
            <div className="label">
              <span className="label-text font-semibold">選択結果</span>
            </div>
            <p className="font-bold text-lg">{data.selectedItem}</p>
            <p className="text-sm text-base-content/60 mt-1">フラグ: {data.resultFlagKey}</p>
          </div>
        )}
      </BaseNodeContent>
      <BaseNodeFooter>
        <button
          type="button"
          className="nodrag btn btn-primary"
          onClick={handleRandomSelect}
          disabled={!isExecuteMode || isLoading || isExecuted}
        >
          {isLoading && <span className="loading loading-spinner loading-sm"></span>}
          ランダム選択
        </button>
      </BaseNodeFooter>
      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
