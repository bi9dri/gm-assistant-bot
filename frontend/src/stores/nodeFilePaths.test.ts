import { describe, test, expect } from "bun:test";

import type { FlowNode } from "./templateEditorStore";

import { collectFilePathsFromNode, collectFilePathsFromNodes } from "./nodeFilePaths";

const makeSendMessageNode = (filePaths: string[]): FlowNode =>
  ({
    id: "SendMessage-1",
    type: "SendMessage",
    position: { x: 0, y: 0 },
    data: {
      title: "メッセージを送信する",
      channelTargets: [{ type: "channelName", value: "general" }],
      messages: [
        {
          content: "hello",
          attachments: filePaths.map((filePath) => ({ filePath, fileName: "file.txt" })),
        },
      ],
    },
  }) as FlowNode;

const makeCombinationSendMessageNode = (filePathsPerEntry: string[][]): FlowNode =>
  ({
    id: "CombinationSendMessage-1",
    type: "CombinationSendMessage",
    position: { x: 0, y: 0 },
    data: {
      title: "組み合わせメッセージを送信する",
      entries: filePathsPerEntry.map((filePaths, i) => ({
        id: `entry-${i}`,
        channelName: "general",
        messages: [
          {
            content: "hello",
            attachments: filePaths.map((filePath) => ({ filePath, fileName: "file.txt" })),
          },
        ],
        collapsed: false,
      })),
    },
  }) as FlowNode;

const makeCreateRoleNode = (): FlowNode =>
  ({
    id: "CreateRole-1",
    type: "CreateRole",
    position: { x: 0, y: 0 },
    data: { title: "ロールを作成する", roles: ["PL"] },
  }) as FlowNode;

describe("collectFilePathsFromNode", () => {
  test("SendMessageノードの添付ファイルパスを返す", () => {
    const node = makeSendMessageNode(["session-1/file1.png", "session-1/file2.png"]);
    expect(collectFilePathsFromNode(node)).toEqual(["session-1/file1.png", "session-1/file2.png"]);
  });

  test("SendMessageノードに添付ファイルがない場合は空配列を返す", () => {
    const node = makeSendMessageNode([]);
    expect(collectFilePathsFromNode(node)).toEqual([]);
  });

  test("CombinationSendMessageノードの全エントリの添付ファイルパスを返す", () => {
    const node = makeCombinationSendMessageNode([
      ["session-1/a.png"],
      ["session-1/b.png", "session-1/c.png"],
    ]);
    expect(collectFilePathsFromNode(node)).toEqual([
      "session-1/a.png",
      "session-1/b.png",
      "session-1/c.png",
    ]);
  });

  test("CombinationSendMessageノードに添付ファイルがない場合は空配列を返す", () => {
    const node = makeCombinationSendMessageNode([[], []]);
    expect(collectFilePathsFromNode(node)).toEqual([]);
  });

  test("ファイルを持たないノードは空配列を返す", () => {
    const node = makeCreateRoleNode();
    expect(collectFilePathsFromNode(node)).toEqual([]);
  });
});

describe("collectFilePathsFromNodes", () => {
  test("複数ノードのファイルパスをまとめて返す", () => {
    const nodes: FlowNode[] = [
      makeSendMessageNode(["session-1/file1.png"]),
      makeCreateRoleNode(),
      makeCombinationSendMessageNode([["session-1/file2.png"]]),
    ];
    expect(collectFilePathsFromNodes(nodes)).toEqual([
      "session-1/file1.png",
      "session-1/file2.png",
    ]);
  });

  test("空配列を渡すと空配列を返す", () => {
    expect(collectFilePathsFromNodes([])).toEqual([]);
  });
});
