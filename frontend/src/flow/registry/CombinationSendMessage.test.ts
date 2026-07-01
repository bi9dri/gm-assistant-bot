import { describe, expect, test } from "bun:test";

import { CombinationSendMessageStepSchema, type CombinationSendMessageStep } from "../schema";
import { CombinationSendMessageEntry } from "./CombinationSendMessage";

const makeStep = (
  overrides: Partial<CombinationSendMessageStep> = {},
): CombinationSendMessageStep => ({
  id: "step-1",
  type: "CombinationSendMessage",
  title: "組み合わせメッセージを送信する",
  memo: "",
  autoAdvance: false,
  entries: [
    { id: "e1", channelName: "", messages: [{ content: "", attachments: [] }], collapsed: false },
  ],
  ...overrides,
});

describe("CombinationSendMessageEntry.defaults", () => {
  test("schema を満たす初期値を返す (id 採番済み)", () => {
    const parsed = CombinationSendMessageStepSchema.parse({
      id: "step-1",
      ...CombinationSendMessageEntry.defaults(),
    });
    expect(parsed.type).toBe("CombinationSendMessage");
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].messages).toHaveLength(1);
    expect(parsed.entries[0].id).not.toBe("");
  });
});

describe("CombinationSendMessageEntry.summary", () => {
  test("チャンネル未設定はフォールバック", () => {
    expect(CombinationSendMessageEntry.summary(makeStep())).toBe("組み合わせ送信 (未設定)");
  });

  test("空白のみのチャンネル名はグループに数えない", () => {
    const step = makeStep({
      entries: [
        {
          id: "e1",
          channelName: "   ",
          messages: [{ content: "", attachments: [] }],
          collapsed: false,
        },
      ],
    });
    expect(CombinationSendMessageEntry.summary(step)).toBe("組み合わせ送信 (未設定)");
  });

  test("設定済みグループ数を要約", () => {
    const step = makeStep({
      entries: [
        {
          id: "e1",
          channelName: "村",
          messages: [{ content: "", attachments: [] }],
          collapsed: false,
        },
        {
          id: "e2",
          channelName: "",
          messages: [{ content: "", attachments: [] }],
          collapsed: false,
        },
        {
          id: "e3",
          channelName: "町",
          messages: [{ content: "", attachments: [] }],
          collapsed: false,
        },
      ],
    });
    expect(CombinationSendMessageEntry.summary(step)).toBe("組み合わせ送信: 2 グループ");
  });
});
