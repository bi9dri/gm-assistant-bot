import { describe, expect, test } from "bun:test";

import type { Step } from "@/flow/schema";

import { blockCopyText, isImportableTextFile, splitTextBlocks } from "./textTransfer";

const base = { title: "", memo: "", autoAdvance: false };

describe("blockCopyText", () => {
  test("本文ブロックは body をそのまま返す", () => {
    const block: Step = { ...base, id: "t", type: "Text", body: "館に着いた。\n扉を叩く。" };
    expect(blockCopyText(block)).toBe("館に着いた。\n扉を叩く。");
  });

  test("SendMessage は全メッセージを空行で連結する", () => {
    const block: Step = {
      ...base,
      id: "sm",
      type: "SendMessage",
      channelTargets: [{ type: "channelName", value: "全体" }],
      messages: [
        { content: "調査を開始します", attachments: [] },
        { content: "制限時間は 30 分", attachments: [] },
      ],
    };
    expect(blockCopyText(block)).toBe("調査を開始します\n\n制限時間は 30 分");
  });

  test("コピー対象を持たないブロックは空文字", () => {
    const block: Step = { ...base, id: "h", type: "Heading", level: 1, collapsed: false };
    expect(blockCopyText(block)).toBe("");
  });
});

describe("splitTextBlocks", () => {
  test("空行で段落に割る", () => {
    expect(splitTextBlocks("第一段落\n続き\n\n第二段落")).toEqual(["第一段落\n続き", "第二段落"]);
  });

  test("連続した空行は 1 つの区切りとして扱う", () => {
    expect(splitTextBlocks("A\n\n\n\nB")).toEqual(["A", "B"]);
  });

  test("先頭・末尾の空行では空のブロックを作らない", () => {
    expect(splitTextBlocks("\n\nA\n\n\n")).toEqual(["A"]);
  });

  test("空ファイルは 1 つもブロックを作らない", () => {
    expect(splitTextBlocks("")).toEqual([]);
    expect(splitTextBlocks("   \n\n  ")).toEqual([]);
  });

  test("CRLF 改行でも空行区切りが成立する", () => {
    expect(splitTextBlocks("A\r\n\r\nB")).toEqual(["A", "B"]);
  });
});

describe("isImportableTextFile", () => {
  test(".txt / .md を大文字小文字を問わず受け入れる", () => {
    expect(isImportableTextFile(new File([], "scenario.txt"))).toBe(true);
    expect(isImportableTextFile(new File([], "scenario.MD"))).toBe(true);
  });

  test("それ以外の拡張子は受け入れない", () => {
    expect(isImportableTextFile(new File([], "scenario.pdf"))).toBe(false);
    expect(isImportableTextFile(new File([], "mdtxt"))).toBe(false);
  });
});
