import { ResourceSelector } from "@/components/Node/utils";

import { DeleteChannelStepSchema, type DeleteChannelStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const nonEmpty = (values: string[]): string[] => values.filter((value) => value.trim() !== "");

const DeleteChannelDetailPanel = ({ step, onChange }: DetailPanelProps<DeleteChannelStep>) => (
  <div className="flex flex-col gap-2">
    {step.channelNames.map((name, index) => (
      // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
      <div key={`channel-${index}`} className="flex items-center gap-2">
        <div className="flex-1">
          <ResourceSelector
            nodeId={step.id}
            resourceType="channel"
            value={name}
            onChange={(newName) =>
              onChange({
                channelNames: step.channelNames.map((v, i) => (i === index ? newName : v)),
              })
            }
            placeholder="チャンネル名を入力"
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() =>
            onChange({ channelNames: step.channelNames.filter((_, i) => i !== index) })
          }
        >
          削除
        </button>
      </div>
    ))}
    <button
      type="button"
      className="btn btn-ghost btn-sm self-start"
      onClick={() => onChange({ channelNames: [...step.channelNames, ""] })}
    >
      チャンネルを追加
    </button>
  </div>
);

export const DeleteChannelEntry = defineStep<DeleteChannelStep>({
  type: "DeleteChannel",
  schema: DeleteChannelStepSchema,
  category: "action",
  defaults: () => ({
    type: "DeleteChannel",
    title: "チャンネルを削除する",
    memo: "",
    autoAdvance: false,
    channelNames: [],
  }),
  summary: (step) => {
    const names = nonEmpty(step.channelNames);
    return names.length > 0 ? `チャンネル削除: ${names.join(", ")}` : "チャンネル削除 (未設定)";
  },
  DetailPanel: DeleteChannelDetailPanel,
});
