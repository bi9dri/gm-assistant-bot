import type { JSONContent } from "@tiptap/core";

import { BRANCH_NODE_NAME, STEP_NODE_NAME } from "./schema";

export interface OutlineEntry {
  index: number;
  level: number;
  text: string;
}

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
