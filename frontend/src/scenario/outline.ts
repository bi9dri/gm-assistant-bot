import type { HeadingStep, Step } from "@/flow/schema";

// フラットなブロック列を Heading の level で階層化したビュー (docs: scenario-editor-architecture D8 / D22)。
// 本文の折りたたみ (<details>) と目次パネルはどちらもこの木を描画する。
// データはフラットなままなので、index は元のブロック列での位置 (dnd のドロップ先に使う)。

export interface OutlineSection {
  kind: "section";
  heading: HeadingStep;
  index: number;
  children: OutlineNode[];
}

export type OutlineNode = { kind: "block"; block: Step; index: number } | OutlineSection;

export const buildOutline = (blocks: Step[]): OutlineNode[] => {
  const root: OutlineNode[] = [];
  // 開いている見出しのスタック。同レベル以下の見出しが来たらそこまで閉じる。
  const open: OutlineSection[] = [];
  const current = (): OutlineNode[] => open.at(-1)?.children ?? root;

  blocks.forEach((block, index) => {
    if (block.type !== "Heading") {
      current().push({ kind: "block", block, index });
      return;
    }
    for (let top = open.at(-1); top !== undefined && top.heading.level >= block.level;) {
      open.pop();
      top = open.at(-1);
    }
    const section: OutlineSection = { kind: "section", heading: block, index, children: [] };
    current().push(section);
    open.push(section);
  });

  return root;
};
