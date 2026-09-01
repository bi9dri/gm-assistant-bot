import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { STEP_NODE_NAME } from "../schema";
import { StepNodeView } from "./nodeViews";
import { stepIdAttribute } from "./stepIdAttribute";

// 文中の Discord 操作を表すインラインアトム (docs: scenario-editor-architecture D24)。
// 実体は持たず stepId の参照だけを置く (D25)。

export const StepNode = Node.create({
  name: STEP_NODE_NAME,
  group: "inline",
  inline: true,
  atom: true,
  // 段落間の移動はドラッグで行えるようにする (挿入位置の入れ替えが本文編集の主な操作)。
  draggable: true,
  addAttributes: () => stepIdAttribute,
  parseHTML: () => [{ tag: "span[data-step-id]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes)],
  addNodeView: () => ReactNodeViewRenderer(StepNodeView, { as: "span" }),
});
