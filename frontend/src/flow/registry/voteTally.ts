// 投票ブロックの純粋ロジック (絵文字の割り当て・本文組み立て・集計変換)。
// Discord 呼び出しを伴わないので execute() から切り出して単体で検証する。

// 選択肢に付けるリアクション絵文字。並び順が選択肢の index に対応する。
// 数字絵文字に固定して絵文字ピッカーを持たない (選択肢の上限もこの長さで決まる)。
export const VOTE_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export const voteMessageContent = (question: string, options: string[]): string =>
  [question, ...options.map((option, index) => `${VOTE_EMOJIS[index]} ${option}`)]
    .filter((line) => line.trim() !== "")
    .join("\n");

interface ReactionCount {
  emoji: string;
  count: number;
}

// 絵文字ごとの票数を選択肢ごとの票数に変換する。
// 選択肢に対応しない絵文字 (参加者が勝手に付けたリアクション) は無視する。
export const toTally = (
  options: string[],
  reactions: ReactionCount[],
): { option: string; count: number }[] =>
  options.map((option, index) => ({
    option,
    count: reactions.find((reaction) => reaction.emoji === VOTE_EMOJIS[index])?.count ?? 0,
  }));
