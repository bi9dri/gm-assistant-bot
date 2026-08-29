import { describe, expect, test } from "bun:test";

import type { VoteStep } from "../schema";
import { VoteEntry } from "./Vote";

const makeStep = (overrides: Partial<VoteStep> = {}): VoteStep => ({
  id: "step-1",
  type: "Vote",
  title: "投票",
  memo: "",
  autoAdvance: false,
  channelName: "",
  question: "",
  options: ["アリス", "ボブ"],
  ...overrides,
});

describe("VoteEntry.summary", () => {
  test("チャンネル未設定はフォールバック", () => {
    expect(VoteEntry.summary(makeStep())).toBe("投票 (未設定)");
  });

  test("選択肢が 2 つ未満はフォールバック", () => {
    expect(VoteEntry.summary(makeStep({ channelName: "全体", options: ["アリス", " "] }))).toBe(
      "投票 (未設定)",
    );
  });

  test("質問が空なら選択肢数だけを出す", () => {
    expect(VoteEntry.summary(makeStep({ channelName: "全体" }))).toBe("投票: 全体へ 2択");
  });

  test("質問があれば質問と選択肢数を出す", () => {
    const step = makeStep({ channelName: "全体", question: "誰を追放しますか" });
    expect(VoteEntry.summary(step)).toBe("投票: 全体へ 誰を追放しますか (2択)");
  });
});
