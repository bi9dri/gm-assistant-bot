import { describe, expect, test } from "bun:test";

import type { DeleteChannelStep } from "../schema";

import { DeleteChannelEntry } from "./DeleteChannel";

const step = (overrides: Partial<DeleteChannelStep> = {}): DeleteChannelStep => ({
  id: "step-1",
  type: "DeleteChannel",
  title: "チャンネルを削除する",
  memo: "",
  autoAdvance: false,
  channelNames: [],
  ...overrides,
});

describe("DeleteChannelEntry.summary", () => {
  test("チャンネル名を列挙する", () => {
    expect(DeleteChannelEntry.summary(step({ channelNames: ["全体", "個別"] }))).toBe(
      "チャンネル削除: 全体, 個別",
    );
  });

  test("空白のみのチャンネル名は除外する", () => {
    expect(DeleteChannelEntry.summary(step({ channelNames: ["  ", "ロビー"] }))).toBe(
      "チャンネル削除: ロビー",
    );
  });

  test("未設定ならフォールバック文を返す", () => {
    expect(DeleteChannelEntry.summary(step({ channelNames: [] }))).toBe("チャンネル削除 (未設定)");
    expect(DeleteChannelEntry.summary(step({ channelNames: ["   "] }))).toBe(
      "チャンネル削除 (未設定)",
    );
  });
});
