import type { JSONContent } from "@tiptap/core";

import { BRANCH_NODE_NAME, STEP_NODE_NAME } from "./schema";

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

// 見出しと操作を文書順に並べた列。引用や箇条書きの中の見出しも DOM には出る以上、
// トップレベルだけを見ると目次の index が DOM の並びとずれ、別の見出しへ飛ぶ。
type DocItem = { kind: "heading"; level: number; text: string } | { kind: "step"; stepId: string };

const nodeText = (node: JSONContent): string =>
  node.text ?? (node.content ?? []).map(nodeText).join("");

const flatten = (node: JSONContent, out: DocItem[]): void => {
  if (node.type === STEP_NODE_NAME || node.type === BRANCH_NODE_NAME) {
    const stepId: unknown = node.attrs?.stepId;
    if (typeof stepId === "string") out.push({ kind: "step", stepId });
    return;
  }
  if (node.type === "heading") {
    const level: unknown = node.attrs?.level;
    out.push({
      kind: "heading",
      level: typeof level === "number" ? level : 1,
      text: nodeText(node),
    });
    // 見出しの中にも操作を置ける (heading の content は inline)。
  }
  for (const child of node.content ?? []) flatten(child, out);
};

const docItems = (doc: JSONContent): DocItem[] => {
  const out: DocItem[] = [];
  flatten(doc, out);
  return out;
};

export const buildOutline = (doc: JSONContent): OutlineEntry[] => {
  const entries: OutlineEntry[] = [];
  for (const item of docItems(doc)) {
    if (item.kind !== "heading") continue;
    entries.push({ index: entries.length, level: item.level, text: item.text });
  }
  return entries;
};

// 見出しが束ねる範囲 (見出し自身から、次の同レベル以下の見出しの手前まで) の stepId。
// 「ここから再実行」で実行痕跡を消す範囲 (docs: scenario-editor-architecture D9)。
export const sectionStepIds = (doc: JSONContent, headingIndex: number): string[] => {
  const items = docItems(doc);
  const headings = items.flatMap((item, position) => (item.kind === "heading" ? [position] : []));
  const start = headings[headingIndex];
  if (start === undefined) return [];
  const from = items[start];
  if (from?.kind !== "heading") return [];
  const end =
    headings.slice(headingIndex + 1).find((position) => {
      const next = items[position];
      return next?.kind === "heading" && next.level <= from.level;
    }) ?? items.length;
  return items.slice(start, end).flatMap((item) => (item.kind === "step" ? [item.stepId] : []));
};
