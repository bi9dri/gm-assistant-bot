import { describe, test, expect } from "vite-plus/test";

import type { ReactFlowData } from "./db";
import { collectFilePathsFromReactFlowData, convertFilePathsInReactFlowData } from "./fileSystem";

describe("collectFilePathsFromReactFlowData", () => {
  const makeReactFlowData = (nodes: unknown[]): ReactFlowData => ({
    nodes,
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });

  test("SendMessageノードから全添付ファイルパスを収集する", () => {
    const data = makeReactFlowData([
      {
        type: "SendMessage",
        data: {
          messages: [
            {
              content: "hello",
              attachments: [
                { fileName: "img.png", filePath: "template/1/img.png", fileSize: 100 },
                { fileName: "doc.pdf", filePath: "template/1/a3f2c1b4/doc.pdf", fileSize: 200 },
              ],
            },
            {
              content: "world",
              attachments: [{ fileName: "vid.mp4", filePath: "template/1/vid.mp4", fileSize: 300 }],
            },
          ],
        },
      },
    ]);

    const result = collectFilePathsFromReactFlowData(data);

    expect(result).toEqual([
      "template/1/img.png",
      "template/1/a3f2c1b4/doc.pdf",
      "template/1/vid.mp4",
    ]);
  });

  test("CombinationSendMessageノードから全添付ファイルパスを収集する", () => {
    const data = makeReactFlowData([
      {
        type: "CombinationSendMessage",
        data: {
          entries: [
            {
              channelName: "general",
              messages: [
                {
                  content: "hi",
                  attachments: [
                    { fileName: "img.png", filePath: "template/1/img.png", fileSize: 100 },
                    { fileName: "doc.pdf", filePath: "template/1/doc.pdf", fileSize: 200 },
                  ],
                },
              ],
            },
            {
              channelName: "staff",
              messages: [
                {
                  content: "yo",
                  attachments: [
                    { fileName: "vid.mp4", filePath: "template/1/vid.mp4", fileSize: 300 },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]);

    const result = collectFilePathsFromReactFlowData(data);

    expect(result).toEqual(["template/1/img.png", "template/1/doc.pdf", "template/1/vid.mp4"]);
  });

  test("添付ファイルを持たないノードは無視される", () => {
    const data = makeReactFlowData([{ type: "CreateRole", data: { title: "GM" } }]);

    const result = collectFilePathsFromReactFlowData(data);

    expect(result).toEqual([]);
  });

  test("複数ノード混在時に全ファイルパスを収集する", () => {
    const data = makeReactFlowData([
      {
        type: "SendMessage",
        data: {
          messages: [
            {
              content: "a",
              attachments: [{ fileName: "a.png", filePath: "template/1/a.png", fileSize: 100 }],
            },
          ],
        },
      },
      { type: "CreateRole", data: { title: "GM" } },
      {
        type: "CombinationSendMessage",
        data: {
          entries: [
            {
              channelName: "ch",
              messages: [
                {
                  content: "b",
                  attachments: [{ fileName: "b.png", filePath: "template/1/b.png", fileSize: 200 }],
                },
              ],
            },
          ],
        },
      },
    ]);

    const result = collectFilePathsFromReactFlowData(data);

    expect(result).toEqual(["template/1/a.png", "template/1/b.png"]);
  });

  test("同一パスの重複が含まれる場合もそのまま返す（重複排除は呼び出し元の責務）", () => {
    const data = makeReactFlowData([
      {
        type: "SendMessage",
        data: {
          messages: [
            {
              content: "a",
              attachments: [{ fileName: "img.png", filePath: "template/1/img.png", fileSize: 100 }],
            },
            {
              content: "b",
              attachments: [{ fileName: "img.png", filePath: "template/1/img.png", fileSize: 100 }],
            },
          ],
        },
      },
    ]);

    const result = collectFilePathsFromReactFlowData(data);

    expect(result).toEqual(["template/1/img.png", "template/1/img.png"]);
  });
});

describe("convertFilePathsInReactFlowData", () => {
  const makeReactFlowData = (nodes: unknown[]): ReactFlowData => ({
    nodes,
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });

  const replacer = (filePath: string) => filePath.replace("template/1/", "files/");

  test("SendMessageNode の messages[].attachments[].filePath を変換する", () => {
    const data = makeReactFlowData([
      {
        type: "SendMessage",
        data: {
          messages: [
            {
              content: "hello",
              attachments: [
                { fileName: "img.png", filePath: "template/1/img.png", fileSize: 100 },
                { fileName: "doc.pdf", filePath: "template/1/a3f2c1b4/doc.pdf", fileSize: 200 },
              ],
            },
            {
              content: "world",
              attachments: [{ fileName: "vid.mp4", filePath: "template/1/vid.mp4", fileSize: 300 }],
            },
          ],
        },
      },
    ]);

    const result = convertFilePathsInReactFlowData(data, replacer);

    expect(result.nodes[0].data.messages[0].attachments[0].filePath).toBe("files/img.png");
    expect(result.nodes[0].data.messages[0].attachments[1].filePath).toBe("files/a3f2c1b4/doc.pdf");
    expect(result.nodes[0].data.messages[1].attachments[0].filePath).toBe("files/vid.mp4");
  });

  test("CombinationSendMessageNode の entries[].messages[].attachments[].filePath を変換する", () => {
    const data = makeReactFlowData([
      {
        type: "CombinationSendMessage",
        data: {
          entries: [
            {
              channelName: "general",
              messages: [
                {
                  content: "hi",
                  attachments: [
                    { fileName: "img.png", filePath: "template/1/img.png", fileSize: 100 },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]);

    const result = convertFilePathsInReactFlowData(data, replacer);

    expect(result.nodes[0].data.entries[0].messages[0].attachments[0].filePath).toBe(
      "files/img.png",
    );
  });

  test("attachments を持たないノードは変更されない", () => {
    const node = { type: "CreateRole", data: { title: "GM" } };
    const data = makeReactFlowData([node]);

    const result = convertFilePathsInReactFlowData(data, replacer);

    expect(result.nodes[0]).toEqual(node);
  });

  test("元のオブジェクトを変更しない（immutability）", () => {
    const data = makeReactFlowData([
      {
        type: "SendMessage",
        data: {
          messages: [
            {
              content: "hello",
              attachments: [{ fileName: "img.png", filePath: "template/1/img.png", fileSize: 100 }],
            },
          ],
        },
      },
    ]);

    const originalPath = data.nodes[0].data.messages[0].attachments[0].filePath;
    convertFilePathsInReactFlowData(data, replacer);

    expect(data.nodes[0].data.messages[0].attachments[0].filePath).toBe(originalPath);
  });
});
