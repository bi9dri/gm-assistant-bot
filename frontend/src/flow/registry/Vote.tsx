import { ResourceSelector } from "@/components/Node/utils/ResourceSelector";

import { VoteStepSchema, type VoteStep } from "../schema";
import { findChannelByName } from "./channelHelpers";
import { defineStep, type DetailPanelProps } from "./types";
import { toTally, voteMessageContent, VOTE_EMOJIS } from "./voteTally";

const VoteDetailPanel = ({ step, onChange }: DetailPanelProps<VoteStep>) => (
  <div className="flex flex-col gap-3">
    <fieldset className="fieldset">
      <legend className="fieldset-legend">投票するチャンネル</legend>
      <ResourceSelector
        nodeId={step.id}
        resourceType="channel"
        value={step.channelName}
        onChange={(value) => onChange({ channelName: value })}
        placeholder="チャンネル名"
        channelTypeFilter="text"
      />
    </fieldset>

    <fieldset className="fieldset">
      <legend className="fieldset-legend">質問</legend>
      <input
        type="text"
        className="input w-full"
        value={step.question}
        onChange={(evt) => onChange({ question: evt.target.value })}
        placeholder="例: 誰を追放しますか"
      />
    </fieldset>

    <div>
      <div className="label">
        <span className="label-text font-semibold">選択肢 ({step.options.length})</span>
      </div>
      {step.options.map((option, index) => (
        // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
        <div key={`option-${index}`} className="mb-2 flex items-center gap-2">
          <span className="w-6 text-center">{VOTE_EMOJIS[index]}</span>
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            value={option}
            onChange={(evt) =>
              onChange({
                options: step.options.map((v, i) => (i === index ? evt.target.value : v)),
              })
            }
            placeholder="選択肢を入力"
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange({ options: step.options.filter((_, i) => i !== index) })}
          >
            削除
          </button>
        </div>
      ))}
      {step.options.length < VOTE_EMOJIS.length && (
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-1"
          onClick={() => onChange({ options: [...step.options, ""] })}
        >
          選択肢を追加
        </button>
      )}
    </div>

    <div className="rounded border border-base-300 p-3">
      {step.tally === undefined ? (
        <p className="text-sm text-base-content/60">
          {step.messageId === undefined
            ? "実行すると投票メッセージを送信します"
            : "投票を送信済みです。もう一度実行すると集計します"}
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm font-semibold">集計結果</p>
          <ul className="text-sm">
            {step.tally.map((entry) => (
              <li key={entry.option} className="flex justify-between gap-2">
                <span>{entry.option}</span>
                <span className="font-mono font-semibold">{entry.count}票</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  </div>
);

export const VoteEntry = defineStep<VoteStep>({
  type: "Vote",
  schema: VoteStepSchema,
  category: "action",
  defaults: () => ({
    type: "Vote",
    title: "投票",
    memo: "",
    autoAdvance: false,
    channelName: "",
    question: "",
    // schema が選択肢を 2 つ以上要求するため placeholder を入れる。
    options: ["選択肢1", "選択肢2"],
  }),
  summary: (step) => {
    const channel = step.channelName.trim();
    const options = step.options.filter((option) => option.trim() !== "").length;
    if (channel === "" || options < 2) return "投票 (未設定)";
    const question = step.question.trim();
    return `投票: ${channel}へ ${question === "" ? `${options}択` : `${question} (${options}択)`}`;
  },
  DetailPanel: VoteDetailPanel,
  // 1 回目の実行で投票メッセージを送り、2 回目以降の実行で集計する。
  // Gateway を張らないため、集計は GM が再実行したタイミングのポーリングになる (D17)。
  execute: async (step, ctx) => {
    const channelName = step.channelName.trim();
    if (channelName === "") return { status: "error", message: "チャンネル名を入力してください" };

    const options = step.options.map((option) => option.trim()).filter((option) => option !== "");
    if (options.length < 2) return { status: "error", message: "選択肢を2つ以上入力してください" };

    const channel = findChannelByName(ctx.resources.channels, channelName);
    if (channel === undefined) {
      return { status: "error", message: `チャンネル「${channelName}」が見つかりません` };
    }

    if (step.messageId === undefined) {
      try {
        const message = await ctx.discord.sendVote({
          channelId: channel.id,
          content: voteMessageContent(step.question, options),
          optionEmojis: options.map((_, index) => VOTE_EMOJIS[index]),
        });
        return {
          status: "success",
          message: `${channelName}に投票を送信しました`,
          stepState: { messageId: message.id },
        };
      } catch {
        return { status: "error", message: "投票の送信に失敗しました" };
      }
    }

    try {
      const reactions = await ctx.discord.getVoteResult({
        channelId: channel.id,
        messageId: step.messageId,
      });
      const tally = toTally(options, reactions);
      return {
        status: "success",
        message: `集計しました: ${tally.map((entry) => `${entry.option} ${entry.count}票`).join(" / ")}`,
        stepState: { tally },
      };
    } catch {
      return { status: "error", message: "投票の集計に失敗しました" };
    }
  },
});
