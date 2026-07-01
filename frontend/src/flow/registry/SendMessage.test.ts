import { describe, expect, test } from "bun:test";

import { SendMessageStepSchema, type SendMessageStep } from "../schema";
import { SendMessageEntry } from "./SendMessage";

const makeStep = (overrides: Partial<SendMessageStep> = {}): SendMessageStep => ({
  id: "step-1",
  type: "SendMessage",
  title: "メッセージを送信する",
  memo: "",
  autoAdvance: false,
  channelTargets: [{ type: "channelName", value: "" }],
  messages: [{ content: "", attachments: [] }],
  ...overrides,
});

describe("SendMessageEntry.defaults", () => {
  test("schema を満たす初期値を返す", () => {
    const parsed = SendMessageStepSchema.parse({ id: "step-1", ...SendMessageEntry.defaults() });
    expect(parsed.type).toBe("SendMessage");
    expect(parsed.channelTargets).toHaveLength(1);
    expect(parsed.messages).toHaveLength(1);
  });
});

describe("SendMessageEntry.summary", () => {
  test("送信先が無ければフォールバック", () => {
    expect(SendMessageEntry.summary(makeStep())).toBe("メッセージ送信 (未設定)");
  });

  test("空白のみの送信先もフォールバック", () => {
    expect(
      SendMessageEntry.summary(
        makeStep({ channelTargets: [{ type: "channelName", value: "  " }] }),
      ),
    ).toBe("メッセージ送信 (未設定)");
  });

  test("単一の送信先と通数を要約", () => {
    const step = makeStep({
      channelTargets: [{ type: "channelName", value: "全体" }],
      messages: [
        { content: "a", attachments: [] },
        { content: "b", attachments: [] },
      ],
    });
    expect(SendMessageEntry.summary(step)).toBe("メッセージ送信: 全体へ 2通");
  });

  test("複数の送信先は先頭 + 他へ (flagKey も対象)", () => {
    const step = makeStep({
      channelTargets: [
        { type: "channelName", value: "全体" },
        { type: "flagKey", value: "村人部屋" },
      ],
      messages: [{ content: "a", attachments: [] }],
    });
    expect(SendMessageEntry.summary(step)).toBe("メッセージ送信: 全体 他へ 1通");
  });
});
