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
  EditableTitle,
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

  const handleReset = () => {
    updateNodeData(id, {
      selectedValue: undefined,
      executedAt: undefined,
    });
    setSelectedOption("");
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
        {isExecuteMode && isExecuted && (
          <div className="bg-success/20 rounded p-3 text-center mb-2">
            <div className="text-sm text-base-content/70">選択結果</div>
            <div className="font-semibold">{selectedLabel}</div>
          </div>
        )}

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

            {!isExecuted && (
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
        {isExecuteMode && isExecuted ? (
          <button
            type="button"
            className="nodrag btn btn-outline btn-sm w-full"
            onClick={handleReset}
          >
            やり直す
          </button>
        ) : (
          <button
            type="button"
            className="nodrag btn btn-primary w-full"
            onClick={handleExecute}
            disabled={!isExecuteMode || isLoading || !selectedOption}
          >
            {isLoading && <span className="loading loading-spinner loading-sm" />}
            確定する
          </button>
        )}
      </BaseNodeFooter>

      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
