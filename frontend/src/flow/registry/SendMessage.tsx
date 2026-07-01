import { ResourceSelector } from "@/components/Node/utils/ResourceSelector";

import { MessageBlocksEditor } from "../components/MessageBlocksEditor";
import { SendMessageStepSchema, type SendMessageStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

type ChannelTarget = SendMessageStep["channelTargets"][number];

const SendMessageDetailPanel = ({ step, onChange }: DetailPanelProps<SendMessageStep>) => {
  const updateTargetValue = (index: number, value: string) =>
    onChange({
      channelTargets: step.channelTargets.map((target, i) =>
        i === index ? { ...target, value } : target,
      ),
    });

  const updateTargetType = (index: number, type: ChannelTarget["type"]) => {
    const next: ChannelTarget =
      type === "channelName" ? { type: "channelName", value: "" } : { type: "flagKey", value: "" };
    onChange({
      channelTargets: step.channelTargets.map((target, i) => (i === index ? next : target)),
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold">送信先チャンネル</p>
        {step.channelTargets.map((target, index) => (
          // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない送信先配列
          <div key={`channel-${index}`} className="space-y-1">
            <div className="flex flex-wrap gap-3">
              <label className="label cursor-pointer gap-1 p-0">
                <input
                  type="radio"
                  name={`channel-type-${step.id}-${index}`}
                  className="radio radio-xs"
                  checked={target.type === "channelName"}
                  onChange={() => updateTargetType(index, "channelName")}
                />
                <span className="label-text text-xs">チャンネル名</span>
              </label>
              <label className="label cursor-pointer gap-1 p-0">
                <input
                  type="radio"
                  name={`channel-type-${step.id}-${index}`}
                  className="radio radio-xs"
                  checked={target.type === "flagKey"}
                  onChange={() => updateTargetType(index, "flagKey")}
                />
                <span className="label-text text-xs">フラグから取得</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {target.type === "channelName" ? (
                  <ResourceSelector
                    nodeId={step.id}
                    resourceType="channel"
                    value={target.value}
                    onChange={(value) => updateTargetValue(index, value)}
                    placeholder="チャンネル名"
                    channelTypeFilter="text"
                  />
                ) : (
                  <ResourceSelector
                    nodeId={step.id}
                    resourceType="gameFlag"
                    value={target.value}
                    onChange={(value) => updateTargetValue(index, value)}
                    placeholder="フラグ名"
                  />
                )}
              </div>
              {step.channelTargets.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    onChange({ channelTargets: step.channelTargets.filter((_, i) => i !== index) })
                  }
                >
                  削除
                </button>
              )}
            </div>
            {target.type === "flagKey" && (
              <p className="text-xs text-warning">
                フラグの値に一致するチャンネルが存在しない場合、送信に失敗します
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm self-start"
          onClick={() =>
            onChange({
              channelTargets: [...step.channelTargets, { type: "channelName", value: "" }],
            })
          }
        >
          + チャンネルを追加
        </button>
      </div>

      <div className="divider my-0" />

      <div className="space-y-2">
        <p className="text-xs font-semibold">メッセージ</p>
        <MessageBlocksEditor
          nodeId={step.id}
          messages={step.messages}
          onChange={(messages) => onChange({ messages })}
        />
      </div>
    </div>
  );
};

export const SendMessageEntry = defineStep<SendMessageStep>({
  type: "SendMessage",
  schema: SendMessageStepSchema,
  category: "action",
  defaults: () => ({
    type: "SendMessage",
    title: "メッセージを送信する",
    memo: "",
    autoAdvance: false,
    channelTargets: [{ type: "channelName", value: "" }],
    messages: [{ content: "", attachments: [] }],
  }),
  summary: (step) => {
    const targets = step.channelTargets
      .map((target) => target.value.trim())
      .filter((v) => v !== "");
    if (targets.length === 0) return "メッセージ送信 (未設定)";
    const dest = targets.length > 1 ? `${targets[0]} 他` : targets[0];
    return `メッセージ送信: ${dest}へ ${step.messages.length}通`;
  },
  DetailPanel: SendMessageDetailPanel,
});
