import { Position, type Node, type NodeProps } from "@xyflow/react";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeDataSchema,
  NODE_CONTENT_HEIGHTS,
  NODE_TYPE_WIDTHS,
} from "../base";

const BlueprintParameterSchema = z.object({
  characterNames: z.array(z.string().trim()),
  voiceChannelCount: z.number().int().min(0).max(10).default(0),
  categoryName: z.string().trim().default(""),
  sharedTextChannels: z.array(z.string().trim()).default([]),
});

export const DataSchema = BaseNodeDataSchema.extend({
  parameters: BlueprintParameterSchema,
});

type BlueprintNodeData = Node<z.infer<typeof DataSchema>, "Blueprint">;

export const BlueprintNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<BlueprintNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const expandBlueprint = useTemplateEditorStore((state) => state.expandBlueprint);

  const handleCategoryNameChange = (value: string) => {
    updateNodeData(id, {
      parameters: { ...data.parameters, categoryName: value },
    });
  };

  const handleCharacterNameChange = (index: number, value: string) => {
    const updated = [...data.parameters.characterNames];
    updated[index] = value;
    updateNodeData(id, {
      parameters: { ...data.parameters, characterNames: updated },
    });
  };

  const handleAddCharacter = () => {
    updateNodeData(id, {
      parameters: {
        ...data.parameters,
        characterNames: [...data.parameters.characterNames, ""],
      },
    });
  };

  const handleRemoveCharacter = (index: number) => {
    const updated = data.parameters.characterNames.filter((_, i) => i !== index);
    updateNodeData(id, {
      parameters: { ...data.parameters, characterNames: updated },
    });
  };

  const handleVoiceChannelCountChange = (value: number) => {
    updateNodeData(id, {
      parameters: { ...data.parameters, voiceChannelCount: Math.max(0, Math.min(10, value)) },
    });
  };

  const handleSharedChannelChange = (index: number, value: string) => {
    const updated = [...data.parameters.sharedTextChannels];
    updated[index] = value;
    updateNodeData(id, {
      parameters: { ...data.parameters, sharedTextChannels: updated },
    });
  };

  const handleAddSharedChannel = () => {
    updateNodeData(id, {
      parameters: {
        ...data.parameters,
        sharedTextChannels: [...data.parameters.sharedTextChannels, ""],
      },
    });
  };

  const handleRemoveSharedChannel = (index: number) => {
    const updated = data.parameters.sharedTextChannels.filter((_, i) => i !== index);
    updateNodeData(id, {
      parameters: { ...data.parameters, sharedTextChannels: updated },
    });
  };

  const handleExpand = () => {
    expandBlueprint(id);
  };

  const validCharacters = data.parameters.characterNames.filter((n) => n.trim());
  const validSharedChannels = data.parameters.sharedTextChannels.filter((n) => n.trim());
  const totalTextChannels = validCharacters.length + validSharedChannels.length;

  const sessionPrefix = data.parameters.categoryName.trim();
  const plRoleName = sessionPrefix ? `${sessionPrefix}PL` : "PL";
  const spectatorRoleName = sessionPrefix ? `${sessionPrefix}観戦` : "観戦";

  const isExecuteMode = mode === "execute";

  return (
    <BaseNode width={NODE_TYPE_WIDTHS.Blueprint} className="bg-base-300">
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>マーダーミステリー基本セット</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.lg}>
        {/* Category name */}
        <div className="mb-4">
          <label className="text-xs font-semibold mb-1 block">カテゴリ名</label>
          <input
            type="text"
            className="nodrag input input-bordered input-sm w-full"
            value={data.parameters.categoryName}
            onChange={(e) => handleCategoryNameChange(e.target.value)}
            placeholder="セッション"
            disabled={isExecuteMode}
          />
        </div>

        {/* Character names */}
        <div className="mb-4">
          <label className="text-xs font-semibold mb-1 block">キャラクター名</label>
          {data.parameters.characterNames.map((name, index) => (
            <div key={`char-${index}`} className="flex gap-2 items-center mb-2">
              <input
                type="text"
                className="nodrag input input-bordered input-sm flex-1"
                value={name}
                onChange={(e) => handleCharacterNameChange(index, e.target.value)}
                placeholder="キャラクター名"
                disabled={isExecuteMode}
              />
              {!isExecuteMode && (
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-sm"
                  onClick={() => handleRemoveCharacter(index)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {!isExecuteMode && (
            <button
              type="button"
              className="nodrag btn btn-ghost btn-sm"
              onClick={handleAddCharacter}
            >
              + キャラクターを追加
            </button>
          )}
        </div>

        {/* Voice channel count */}
        <div className="mb-4">
          <label className="text-xs font-semibold mb-1 block">ボイスチャンネル数</label>
          <input
            type="number"
            className="nodrag input input-bordered input-sm w-20"
            value={data.parameters.voiceChannelCount}
            onChange={(e) => handleVoiceChannelCountChange(Number(e.target.value))}
            min={0}
            max={10}
            disabled={isExecuteMode}
          />
        </div>

        {/* Shared text channels */}
        <div className="mb-4">
          <label className="text-xs font-semibold mb-1 block">共通テキストチャンネル</label>
          {data.parameters.sharedTextChannels.map((name, index) => (
            <div key={`shared-${index}`} className="flex gap-2 items-center mb-2">
              <input
                type="text"
                className="nodrag input input-bordered input-sm flex-1"
                value={name}
                onChange={(e) => handleSharedChannelChange(index, e.target.value)}
                placeholder="チャンネル名"
                disabled={isExecuteMode}
              />
              {!isExecuteMode && (
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-sm"
                  onClick={() => handleRemoveSharedChannel(index)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {!isExecuteMode && (
            <button
              type="button"
              className="nodrag btn btn-ghost btn-sm"
              onClick={handleAddSharedChannel}
            >
              + チャンネルを追加
            </button>
          )}
        </div>

        {/* Preview */}
        <div className="text-xs text-base-content/60 mt-4 p-2 bg-base-200 rounded">
          <p className="font-semibold mb-1">生成されるノード:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>
              ロール作成: {plRoleName}, {spectatorRoleName} + キャラクター{validCharacters.length}個
            </li>
            <li>カテゴリ作成: {data.parameters.categoryName.trim() ? 1 : 0}個</li>
            <li>
              チャンネル作成: テキスト{totalTextChannels}個 + VC{data.parameters.voiceChannelCount}
              個
            </li>
            <li>
              {plRoleName}ロールメンバーに{spectatorRoleName}ロール付与
            </li>
            <li>カテゴリ削除</li>
            <li>全ロール削除</li>
          </ul>
        </div>
      </BaseNodeContent>
      {!isExecuteMode && (
        <BaseNodeFooter>
          <button type="button" className="nodrag btn btn-primary" onClick={handleExpand}>
            展開
          </button>
        </BaseNodeFooter>
      )}
      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
