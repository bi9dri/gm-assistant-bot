import { describe, expect, test } from "bun:test";

import type { FlowData } from "./schema";

import { convertFilePathsInFlowData } from "./filePaths";
import { FlowDataSchema } from "./schema";

const flow = (sections: unknown[]): FlowData => FlowDataSchema.parse({ version: 1, sections });

const attachment = (filePath: string) => ({ fileName: "f.png", filePath, fileSize: 1 });

const sendMessage = (id: string, filePath: string) => ({
  id,
  type: "SendMessage",
  title: id,
  channelTargets: [{ type: "channelName", value: "general" }],
  messages: [{ content: "hi", attachments: [attachment(filePath)] }],
});

const replacer = (p: string) => p.replace("template/1/", "session/9/");

describe("convertFilePathsInFlowData", () => {
  test("SendMessage の attachments のパスを書き換える", () => {
    const input = flow([{ id: "s1", title: "S1", steps: [sendMessage("m1", "template/1/a.png")] }]);

    const result = convertFilePathsInFlowData(input, replacer);

    const step = result.sections[0].steps[0];
    if (step.type !== "SendMessage") throw new Error("expected SendMessage");
    expect(step.messages[0].attachments[0].filePath).toBe("session/9/a.png");
    // 入力は変更しない
    const original = input.sections[0].steps[0];
    if (original.type !== "SendMessage") throw new Error("expected SendMessage");
    expect(original.messages[0].attachments[0].filePath).toBe("template/1/a.png");
  });

  test("CombinationSendMessage の entries 内メッセージのパスを書き換える", () => {
    const input = flow([
      {
        id: "s1",
        title: "S1",
        steps: [
          {
            id: "c1",
            type: "CombinationSendMessage",
            title: "C1",
            entries: [
              {
                id: "e1",
                channelName: "general",
                messages: [{ content: "x", attachments: [attachment("template/1/b.png")] }],
              },
            ],
          },
        ],
      },
    ]);

    const result = convertFilePathsInFlowData(input, replacer);

    const step = result.sections[0].steps[0];
    if (step.type !== "CombinationSendMessage") throw new Error("expected CombinationSendMessage");
    expect(step.entries[0].messages[0].attachments[0].filePath).toBe("session/9/b.png");
  });

  test("Branch の arm 内ネスト SendMessage のパスも書き換える", () => {
    const input = flow([
      {
        id: "s1",
        title: "S1",
        steps: [
          {
            id: "br1",
            type: "Branch",
            title: "分岐",
            mode: "select",
            flagName: "f",
            branches: [{ id: "arm1", label: "A", steps: [sendMessage("m1", "template/1/c.png")] }],
          },
        ],
      },
    ]);

    const result = convertFilePathsInFlowData(input, replacer);

    const branch = result.sections[0].steps[0];
    if (branch.type !== "Branch") throw new Error("expected Branch");
    const nested = branch.branches[0].steps[0];
    if (nested.type !== "SendMessage") throw new Error("expected SendMessage");
    expect(nested.messages[0].attachments[0].filePath).toBe("session/9/c.png");
  });

  test("ファイルを持たないステップはそのまま返す", () => {
    const input = flow([
      {
        id: "s1",
        title: "S1",
        steps: [{ id: "f1", type: "SetGameFlag", title: "F1", flagKey: "k", flagValue: "v" }],
      },
    ]);

    const result = convertFilePathsInFlowData(input, replacer);

    expect(result.sections[0].steps[0]).toEqual(input.sections[0].steps[0]);
  });
});
