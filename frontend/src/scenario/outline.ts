import type { JSONContent } from "@tiptap/core";

import { collectStepIds } from "./document";

// doc の heading ノードから組む目次 (docs: scenario-editor-architecture D22)。
// 見出しは階層を表すが入れ子ではない (ProseMirror ドキュメント 1 本・D8) ため、
// 木ではなく level 付きの平坦な列として持ち、表示側がインデントする。

export interface OutlineEntry {
  // 見出しの出現順。DOM 上の h1〜h3 の並び順と一致し、目次からの scroll と
  // 「ここから再実行」の範囲指定に使う (heading ノードは id を持たないため)。
  index: number;
  level: number;
  text: string;
}

const nodeText = (node: JSONContent): string =>
  node.text ?? (node.content ?? []).map(nodeText).join("");

const headingLevel = (node: JSONContent): number | undefined => {
  if (node.type !== "heading") return undefined;
  const level: unknown = node.attrs?.level;
  return typeof level === "number" ? level : 1;
};

export const buildOutline = (doc: JSONContent): OutlineEntry[] => {
  const entries: OutlineEntry[] = [];
  for (const node of doc.content ?? []) {
    const level = headingLevel(node);
    if (level === undefined) continue;
    entries.push({ index: entries.length, level, text: nodeText(node) });
  }
  return entries;
};

// 見出しが束ねる範囲 (見出し自身から、次の同レベル以下の見出しの手前まで) の stepId。
// 「ここから再実行」で実行痕跡を消す範囲 (docs: scenario-editor-architecture D9)。
export const sectionStepIds = (doc: JSONContent, headingIndex: number): string[] => {
  const nodes = doc.content ?? [];
  const positions = nodes.flatMap((node, position) =>
    headingLevel(node) === undefined ? [] : [position],
  );
  const start = positions[headingIndex];
  if (start === undefined) return [];
  const level = headingLevel(nodes[start] as JSONContent) ?? 1;
  const end =
    positions.slice(headingIndex + 1).find((position) => {
      const nextLevel = headingLevel(nodes[position] as JSONContent);
      return nextLevel !== undefined && nextLevel <= level;
    }) ?? nodes.length;
  return collectStepIds({ type: "doc", content: nodes.slice(start, end) });
};
