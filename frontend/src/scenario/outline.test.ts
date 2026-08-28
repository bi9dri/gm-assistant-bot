import { describe, expect, test } from "bun:test";

import type { Step } from "@/flow/schema";

import { buildOutline, type OutlineNode } from "./outline";

const heading = (id: string, level: number): Step => ({
  id,
  type: "Heading",
  title: id,
  memo: "",
  autoAdvance: false,
  level,
  collapsed: false,
});

const text = (id: string): Step => ({
  id,
  type: "Text",
  title: "本文",
  memo: "",
  autoAdvance: false,
  body: "",
});

// 木を "id(index)" のネストした配列に落として比較する。
const shape = (nodes: OutlineNode[]): unknown[] =>
  nodes.map((node) =>
    node.kind === "block"
      ? `${node.block.id}(${node.index})`
      : [`${node.heading.id}(${node.index})`, shape(node.children)],
  );

describe("buildOutline", () => {
  test("見出しの無い列はそのまま並ぶ", () => {
    expect(shape(buildOutline([text("a"), text("b")]))).toEqual(["a(0)", "b(1)"]);
  });

  test("後続ブロックを直前の見出しの下にぶら下げる", () => {
    expect(shape(buildOutline([heading("h1", 1), text("a"), text("b")]))).toEqual([
      ["h1(0)", ["a(1)", "b(2)"]],
    ]);
  });

  test("深い見出しは浅い見出しの子になる", () => {
    const outline = buildOutline([heading("h1", 1), heading("h2", 2), text("a")]);

    expect(shape(outline)).toEqual([["h1(0)", [["h2(1)", ["a(2)"]]]]]);
  });

  test("同レベルの見出しは兄弟になる", () => {
    const outline = buildOutline([heading("h1", 2), text("a"), heading("h2", 2), text("b")]);

    expect(shape(outline)).toEqual([
      ["h1(0)", ["a(1)"]],
      ["h2(2)", ["b(3)"]],
    ]);
  });

  test("浅い見出しは深い見出しを閉じてトップに戻る", () => {
    const outline = buildOutline([
      heading("h1", 1),
      heading("h2", 3),
      text("a"),
      heading("h3", 1),
      text("b"),
    ]);

    expect(shape(outline)).toEqual([
      ["h1(0)", [["h2(1)", ["a(2)"]]]],
      ["h3(3)", ["b(4)"]],
    ]);
  });

  test("見出しより前のブロックはトップレベルに残る", () => {
    expect(shape(buildOutline([text("a"), heading("h1", 1), text("b")]))).toEqual([
      "a(0)",
      ["h1(1)", ["b(2)"]],
    ]);
  });

  test("最初の見出しが H3 でもトップレベルになる", () => {
    expect(shape(buildOutline([heading("h3", 3), text("a")]))).toEqual([["h3(0)", ["a(1)"]]]);
  });
});
