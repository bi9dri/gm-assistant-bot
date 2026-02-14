import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useRef, useState, useEffect } from "react";
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

const BranchOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().min(1).default("選択肢を選ぶ"),
  options: z.array(BranchOptionSchema).min(2),
  flagName: z.string(),
  selectedValue: z.string().optional(),
});

type BranchOption = z.infer<typeof BranchOptionSchema>;
type SelectBranchNodeData = Node<z.infer<typeof DataSchema>, "SelectBranch">;

function generateId(): string {
  return crypto.randomUUID();
}

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

interface OptionListEditorProps {
  options: BranchOption[];
  onOptionsChange: (options: BranchOption[]) => void;
  disabled?: boolean;
}

function OptionListEditor({ options, onOptionsChange, disabled }: OptionListEditorProps) {
  const handleLabelChange = (index: number, newLabel: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], label: newLabel };
    onOptionsChange(updated);
  };

  const handleAdd = () => {
    onOptionsChange([...options, { id: generateId(), label: "" }]);
  };

  const handleRemove = (index: number) => {
    if (options.length <= 2) return;
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-base-content/70">選択肢</div>
      {options.map((option, index) => (
        <div key={option.id} className="flex gap-2 items-center">
          <input
            type="text"
            className="nodrag input input-bordered input-sm flex-1"
            value={option.label}
            onChange={(e) => handleLabelChange(index, e.target.value)}
            placeholder="選択肢"
            disabled={disabled}
          />
          {!disabled && (
            <button
              type="button"
              className="nodrag btn btn-ghost btn-sm btn-square"
              onClick={() => handleRemove(index)}
              title="削除"
              disabled={options.length <= 2}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" className="nodrag btn btn-ghost btn-sm" onClick={handleAdd}>
          + 選択肢を追加
        </button>
      )}
    </div>
  );
}

export const SelectBranchNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<SelectBranchNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>(data.selectedValue ?? "");

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;

  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };

  const handleOptionsChange = (options: BranchOption[]) => {
    updateNodeData(id, { options });
  };

  const handleFlagNameChange = (newKey: string) => {
    updateNodeData(id, { flagName: newKey });
  };

  const handleExecute = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    if (!selectedOption) {
      addToast({ message: "選択肢を選んでください", status: "warning" });
      return;
    }

    const { sessionId } = executionContext;
    const key = data.flagName.trim();

    if (key === "") {
      addToast({ message: "フラグ名を入力してください", status: "warning" });
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
      const updatedFlags = { ...currentFlags, [key]: selectedOption };

      await session.update({ gameFlags: updatedFlags });

      updateNodeData(id, {
        selectedValue: selectedOption,
        executedAt: new Date(),
      });

      addToast({
        message: `「${selectedOption}」を選択しました`,
        status: "success",
        durationSeconds: 5,
      });
    } catch {
      addToast({
        message: "選択の保存に失敗しました",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedLabel = data.selectedValue;

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.SelectBranch}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>{data.title || "選択肢を選ぶ"}</BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="選択肢を選ぶ"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>

      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        {!isExecuteMode && (
          <>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">フラグ名</span>
              </div>
              <input
                type="text"
                className="nodrag input input-bordered w-full"
                value={data.flagName}
                onChange={(e) => handleFlagNameChange(e.target.value)}
                placeholder="例: selectedCriminal"
                disabled={isLoading}
              />
            </label>

            <div className="divider my-2" />

            <OptionListEditor
              options={data.options}
              onOptionsChange={handleOptionsChange}
              disabled={isLoading}
            />
          </>
        )}

        {isExecuteMode && (
          <>
            <div className="text-sm text-base-content/70 mb-2">
              フラグ名: <span className="font-mono">{data.flagName || "(未設定)"}</span>
            </div>

            {isExecuted ? (
              <div className="bg-success/20 rounded p-3 text-center">
                <div className="text-sm text-base-content/70">選択結果</div>
                <div className="font-semibold">{selectedLabel}</div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-base-200"
                  >
                    <input
                      type="radio"
                      name={`select-branch-${id}`}
                      className="nodrag radio radio-sm"
                      value={option.label}
                      checked={selectedOption === option.label}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      disabled={isLoading}
                    />
                    <span className="text-sm">{option.label || "(未入力)"}</span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </BaseNodeContent>

      <BaseNodeFooter>
        <button
          type="button"
          className="nodrag btn btn-primary w-full"
          onClick={handleExecute}
          disabled={!isExecuteMode || isExecuted || isLoading || !selectedOption}
        >
          {isLoading && <span className="loading loading-spinner loading-sm" />}
          確定する
        </button>
      </BaseNodeFooter>

      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
