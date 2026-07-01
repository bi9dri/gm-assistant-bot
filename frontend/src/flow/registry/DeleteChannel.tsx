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
  execute: async (step, ctx) => {
    const validNames = nonEmpty(step.channelNames);
    if (validNames.length === 0)
      return { status: "error", message: "チャンネル名を入力してください" };

    const notFound: string[] = [];
    const targets: typeof ctx.resources.channels = [];
    for (const name of validNames) {
      const found = ctx.resources.channels.find(
        (channel) => channel.name.toLowerCase() === name.toLowerCase(),
      );
      if (found === undefined) notFound.push(name);
      else targets.push(found);
    }
    if (notFound.length > 0) {
      return { status: "error", message: `チャンネルが見つかりません: ${notFound.join(", ")}` };
    }

    const failed: string[] = [];
    for (const channel of targets) {
      try {
        await ctx.discord.deleteChannel(channel.id);
        await ctx.resources.removeChannel(channel.id);
      } catch {
        failed.push(channel.name);
      }
    }
    if (failed.length > 0) {
      return { status: "error", message: `チャンネルの削除に失敗しました: ${failed.join(", ")}` };
    }
    return { status: "success", message: `${targets.length}件のチャンネルを削除しました` };
  },
});
