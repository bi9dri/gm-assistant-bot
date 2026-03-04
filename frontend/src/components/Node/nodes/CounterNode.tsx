import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useLiveQuery } from "dexie-react-hooks";
import z from "zod";

import { GameSession } from "@/db";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  EditableTitle,
  BaseNodeDataSchema,
  NODE_TYPE_WIDTHS,
} from "../base";
import { useNodeExecutionOptional } from "../contexts";

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("カウンター"),
  flagKey: z.string().trim(),
  step: z.number().int().positive().default(1),
});

type CounterNodeData = Node<z.infer<typeof DataSchema>, "Counter">;

export const CounterNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<CounterNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const sessionId = executionContext?.sessionId;

  const currentValue = useLiveQuery(async () => {
    if (!sessionId) return 0;
    const session = await GameSession.getById(sessionId);
    const flags = session?.getParsedGameFlags() ?? {};
    return Number(flags[data.flagKey]) || 0;
  }, [sessionId, data.flagKey]);

  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };

  const handleFlagKeyChange = (newValue: string) => {
    updateNodeData(id, { flagKey: newValue });
  };

  const handleStepChange = (newValue: number) => {
    if (newValue >= 1) {
      updateNodeData(id, { step: newValue });
    }
  };

  const handleCounter = async (delta: number) => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const key = data.flagKey.trim();
    if (key === "") {
      addToast({ message: "フラグ名を入力してください", status: "warning" });
      return;
    }

    try {
      const session = await GameSession.getById(executionContext.sessionId);
      if (!session) {
        addToast({ message: "セッションが見つかりません", status: "error" });
        return;
      }

      const currentFlags = session.getParsedGameFlags();
      const current = Number(currentFlags[key]) || 0;
      await session.update({ gameFlags: { ...currentFlags, [key]: String(current + delta) } });
    } catch {
      addToast({ message: "カウンターの更新に失敗しました", status: "error" });
    }
  };

  const isExecuteMode = mode === "execute";
  const displayValue = currentValue ?? 0;
  const step = data.step ?? 1;

  return (
    <BaseNode width={NODE_TYPE_WIDTHS.Counter} className="bg-base-300">
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>{data.title || "カウンター"}</BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="カウンター"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>
      <BaseNodeContent>
        {!isExecuteMode && (
          <>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">フラグ名</span>
              </div>
              <input
                type="text"
                className="nodrag input input-bordered w-full"
                value={data.flagKey}
                onChange={(evt) => handleFlagKeyChange(evt.target.value)}
                placeholder="例: ラウンド数, ライフ"
              />
            </label>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">増減量</span>
              </div>
              <input
                type="number"
                className="nodrag input input-bordered w-full"
                value={step}
                min={1}
                onChange={(evt) => handleStepChange(Number(evt.target.value))}
              />
            </label>
          </>
        )}
        {isExecuteMode && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="text-xs text-base-content/60">{data.flagKey || "(フラグ未設定)"}</div>
            <div className="text-4xl font-bold tabular-nums">{displayValue}</div>
            <div className="flex gap-2">
              <button
                type="button"
                className="nodrag btn btn-outline btn-sm"
                onClick={() => handleCounter(-step)}
              >
                -{step}
              </button>
              <button
                type="button"
                className="nodrag btn btn-outline btn-sm"
                onClick={() => handleCounter(step)}
              >
                +{step}
              </button>
            </div>
          </div>
        )}
      </BaseNodeContent>
      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
