import { describe, expect, test } from "bun:test";

import { toTally, voteMessageContent, VOTE_EMOJIS } from "./voteTally";

describe("voteMessageContent", () => {
  test("質問と絵文字付きの選択肢を並べる", () => {
    expect(voteMessageContent("誰を追放しますか", ["アリス", "ボブ"])).toBe(
      "誰を追放しますか\n1️⃣ アリス\n2️⃣ ボブ",
    );
  });

  test("質問が空なら選択肢だけを並べる", () => {
    expect(voteMessageContent("", ["アリス"])).toBe("1️⃣ アリス");
  });
});

describe("toTally", () => {
  test("複数絵文字のリアクションを選択肢ごとの票数に変換する", () => {
    const reactions = [
      { emoji: VOTE_EMOJIS[0], count: 3 },
      { emoji: VOTE_EMOJIS[1], count: 1 },
    ];
    expect(toTally(["アリス", "ボブ"], reactions)).toEqual([
      { option: "アリス", count: 3 },
      { option: "ボブ", count: 1 },
    ]);
  });

  test("リアクションが無い選択肢は 0 票になる", () => {
    expect(toTally(["アリス", "ボブ"], [{ emoji: VOTE_EMOJIS[1], count: 2 }])).toEqual([
      { option: "アリス", count: 0 },
      { option: "ボブ", count: 2 },
    ]);
  });

  test("選択肢に対応しない絵文字は無視する", () => {
    expect(toTally(["アリス"], [{ emoji: "🎉", count: 5 }])).toEqual([
      { option: "アリス", count: 0 },
    ]);
  });
});
