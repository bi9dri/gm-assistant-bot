import { describe, expect, test } from "bun:test";

import { convertFilePathsInScenarioData } from "./filePaths";
import { ScenarioDataSchema, type ScenarioData } from "./schema";

// セッション作成時のパス書き換え (docs: scenario-editor-architecture D16)。
// 再帰そのものは flow/filePaths のテストが担保するので、ここではブロック列の入口と
// Branch アームの中まで届くことを確認する。

const scenario = (blocks: unknown[]): ScenarioData =>
  ScenarioDataSchema.parse({ version: 1, blocks });

const attachment = (filePath: string) => ({ fileName: "f.png", filePath, fileSize: 1 });

const sendMessage = (id: string, filePath: string) => ({
  id,
  type: "SendMessage",
  title: id,
  channelTargets: [{ type: "channelName", value: "general" }],
  messages: [{ content: "hi", attachments: [attachment(filePath)] }],
});

const replacer = (path: string) => path.replace("template/1/", "session/9/");

const filePathOf = (data: ScenarioData, index: number): string => {
  const block = data.blocks[index];
  if (block?.type !== "SendMessage") throw new Error("expected SendMessage");
  return block.messages[0]!.attachments[0]!.filePath;
};

describe("convertFilePathsInScenarioData", () => {
  test("ブロック列の添付パスを書き換え、入力は変更しない", () => {
    const input = scenario([sendMessage("m1", "template/1/a.png")]);

    const result = convertFilePathsInScenarioData(input, replacer);

    expect(filePathOf(result, 0)).toBe("session/9/a.png");
    expect(filePathOf(input, 0)).toBe("template/1/a.png");
  });

  test("Branch アームの中のブロックにも届く", () => {
    const input = scenario([
      {
        id: "br",
        type: "Branch",
        title: "分岐",
        mode: "select",
        flagName: "vote",
        branches: [{ id: "a1", label: "枝", steps: [sendMessage("m1", "template/1/b.png")] }],
      },
    ]);

    const result = convertFilePathsInScenarioData(input, replacer);

    const branch = result.blocks[0];
    if (branch?.type !== "Branch") throw new Error("expected Branch");
    const nested = branch.branches[0]!.steps[0];
    if (nested?.type !== "SendMessage") throw new Error("expected SendMessage");
    expect(nested.messages[0]!.attachments[0]!.filePath).toBe("session/9/b.png");
  });

  test("添付を持たないブロックはそのまま残る", () => {
    const input = scenario([
      { id: "t1", type: "Text", title: "本文", body: "館に着いた" },
      sendMessage("m1", "template/1/c.png"),
    ]);

    const result = convertFilePathsInScenarioData(input, replacer);

    expect(result.blocks[0]).toEqual(input.blocks[0]!);
    expect(filePathOf(result, 1)).toBe("session/9/c.png");
  });
});
