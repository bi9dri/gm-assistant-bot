import type { JSONContent } from "@tiptap/core";
import { describe, expect, test } from "vite-plus/test";

import { buildOutline, sectionStepIds } from "./outline";

const heading = (level: number, text: string): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const stepParagraph = (stepId: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "step", attrs: { stepId } }],
});

const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

describe("buildOutline", () => {
  test("見出しを出現順に level 付きで並べる", () => {
    const source = doc(
      heading(1, "導入"),
      { type: "paragraph", content: [{ type: "text", text: "本文" }] },
      heading(2, "調査"),
      heading(1, "解決"),
    );

    expect(buildOutline(source)).toEqual([
      { index: 0, level: 1, text: "導入" },
      { index: 1, level: 2, text: "調査" },
      { index: 2, level: 1, text: "解決" },
    ]);
  });

  test("引用や箇条書きの中の見出しも文書順で拾う", () => {
    const source = doc(
      heading(1, "導入"),
      { type: "blockquote", content: [heading(2, "囲まれた見出し")] },
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [heading(3, "箇条書きの中")] }],
      },
      heading(1, "解決"),
    );

    expect(buildOutline(source).map((entry) => entry.text)).toEqual([
      "導入",
      "囲まれた見出し",
      "箇条書きの中",
      "解決",
    ]);
  });

  test("見出しが無ければ空", () => {
    expect(buildOutline(doc({ type: "paragraph" }))).toEqual([]);
  });

  test("装飾された見出しでもテキストだけを取り出す", () => {
    const source = doc({
      type: "heading",
      attrs: { level: 1 },
      content: [
        { type: "text", text: "重要な" },
        { type: "text", marks: [{ type: "highlight" }], text: "導入" },
      ],
    });

    expect(buildOutline(source)[0]?.text).toBe("重要な導入");
  });

  test("テキストが空の見出しは空文字として扱う", () => {
    const source = doc({ type: "heading", attrs: { level: 2 } });

    expect(buildOutline(source)).toEqual([{ index: 0, level: 2, text: "" }]);
  });
});

describe("sectionStepIds", () => {
  test("次の同レベル見出しの手前までを範囲にする", () => {
    const source = doc(
      heading(1, "導入"),
      stepParagraph("s1"),
      heading(1, "解決"),
      stepParagraph("s2"),
    );

    expect(sectionStepIds(source, 0)).toEqual(["s1"]);
  });

  test("下位の見出しは自分の範囲に含める", () => {
    const source = doc(
      heading(1, "導入"),
      stepParagraph("s1"),
      heading(2, "調査"),
      stepParagraph("s2"),
      heading(1, "解決"),
      stepParagraph("s3"),
    );

    expect(sectionStepIds(source, 0)).toEqual(["s1", "s2"]);
  });

  test("下位見出しからの範囲は自分の配下だけに閉じる", () => {
    const source = doc(
      heading(1, "導入"),
      stepParagraph("s1"),
      heading(2, "調査"),
      stepParagraph("s2"),
    );

    expect(sectionStepIds(source, 1)).toEqual(["s2"]);
  });

  test("末尾の見出しは本文の終わりまで", () => {
    const source = doc(heading(1, "導入"), stepParagraph("s1"), stepParagraph("s2"));

    expect(sectionStepIds(source, 0)).toEqual(["s1", "s2"]);
  });

  test("引用の中の見出しも範囲の区切りになる", () => {
    const source = doc(
      heading(1, "導入"),
      stepParagraph("s1"),
      { type: "blockquote", content: [heading(1, "囲まれた見出し"), stepParagraph("s2")] },
      stepParagraph("s3"),
    );

    expect(sectionStepIds(source, 0)).toEqual(["s1"]);
    expect(sectionStepIds(source, 1)).toEqual(["s2", "s3"]);
  });

  test("存在しない見出しには空を返す", () => {
    expect(sectionStepIds(doc(heading(1, "導入")), 3)).toEqual([]);
  });
});
