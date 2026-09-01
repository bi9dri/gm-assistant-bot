import { describe, expect, test } from "bun:test";

import type { Step } from "@/flow/schema";

import { stepCopyText, isImportableTextFile, splitParagraphs } from "./textTransfer";

const base = { title: "", memo: "", autoAdvance: false };

describe("stepCopyText", () => {
  test("本文ステップは body をそのまま返す", () => {
    const step: Step = { ...base, id: "t", type: "Text", body: "館に着いた。\n扉を叩く。" };
    expect(stepCopyText(step)).toBe("館に着いた。\n扉を叩く。");
  });

  test("SendMessage は全メッセージを空行で連結する", () => {
    const step: Step = {
      ...base,
      id: "sm",
      type: "SendMessage",
      channelTargets: [{ type: "channelName", value: "全体" }],
      messages: [
        { content: "調査を開始します", attachments: [] },
        { content: "制限時間は 30 分", attachments: [] },
      ],
    };
    expect(stepCopyText(step)).toBe("調査を開始します\n\n制限時間は 30 分");
  });

  test("CombinationSendMessage は全エントリのメッセージを空行で連結する", () => {
    const step: Step = {
      ...base,
      id: "cm",
      type: "CombinationSendMessage",
      entries: [
        {
          id: "e1",
          channelName: "探索者A",
          collapsed: false,
          messages: [{ content: "あなたは犯人を見た", attachments: [] }],
        },
        {
          id: "e2",
          channelName: "探索者B",
          collapsed: false,
          messages: [{ content: "あなたは何も見ていない", attachments: [] }],
        },
      ],
    };
    expect(stepCopyText(step)).toBe("あなたは犯人を見た\n\nあなたは何も見ていない");
  });

  test("コピー対象を持たないステップは空文字", () => {
    const step: Step = { ...base, id: "c", type: "Counter", flagKey: "round", step: 1 };
    expect(stepCopyText(step)).toBe("");
  });
});

describe("splitParagraphs", () => {
  test("空行で段落に割る", () => {
    expect(splitParagraphs("第一段落\n続き\n\n第二段落")).toEqual(["第一段落\n続き", "第二段落"]);
  });

  test("連続した空行は 1 つの区切りとして扱う", () => {
    expect(splitParagraphs("A\n\n\n\nB")).toEqual(["A", "B"]);
  });

  test("先頭・末尾の空行では空の段落を作らない", () => {
    expect(splitParagraphs("\n\nA\n\n\n")).toEqual(["A"]);
  });

  test("空ファイルは 1 つも段落を作らない", () => {
    expect(splitParagraphs("")).toEqual([]);
    expect(splitParagraphs("   \n\n  ")).toEqual([]);
  });

  test("空白だけの行も区切りとして扱う", () => {
    expect(splitParagraphs("A\n\u3000\nB")).toEqual(["A", "B"]);
    expect(splitParagraphs("A\n \t\nB")).toEqual(["A", "B"]);
  });

  test("CRLF 改行でも空行区切りが成立する", () => {
    expect(splitParagraphs("A\r\n\r\nB")).toEqual(["A", "B"]);
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
