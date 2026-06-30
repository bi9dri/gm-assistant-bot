import { describe, expect, test } from "bun:test";

import type { CreateChannelStep } from "../schema";

import { CreateChannelEntry } from "./CreateChannel";

const channel = (overrides: Partial<CreateChannelStep["channels"][number]> = {}) => ({
  name: "",
  type: "text" as const,
  rolePermissions: [],
  ...overrides,
});

const step = (overrides: Partial<CreateChannelStep> = {}): CreateChannelStep => ({
  id: "step-1",
  type: "CreateChannel",
  title: "チャンネルを作成する",
  memo: "",
  autoAdvance: false,
  channels: [],
  ...overrides,
});

describe("CreateChannelEntry.summary", () => {
  test("チャンネル名を列挙する", () => {
    expect(
      CreateChannelEntry.summary(
        step({ channels: [channel({ name: "全体" }), channel({ name: "個別", type: "voice" })] }),
      ),
    ).toBe("チャンネル作成: 全体, 個別");
  });

  test("空白のみのチャンネル名は除外する", () => {
    expect(
      CreateChannelEntry.summary(
        step({ channels: [channel({ name: "  " }), channel({ name: "ロビー" })] }),
      ),
    ).toBe("チャンネル作成: ロビー");
  });

  test("未設定ならフォールバック文を返す", () => {
    expect(CreateChannelEntry.summary(step({ channels: [] }))).toBe("チャンネル作成 (未設定)");
    expect(CreateChannelEntry.summary(step({ channels: [channel({ name: "  " })] }))).toBe(
      "チャンネル作成 (未設定)",
    );
  });
});
