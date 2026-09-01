import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { BRANCH_NODE_NAME } from "../schema";
import { BranchNodeView } from "./nodeViews";
import { stepIdAttribute } from "./stepIdAttribute";

// 分岐だけはブロックレベルに置く (docs: scenario-editor-architecture D24)。
// 枝とその中身は Branch ステップの実体側に入れ子で持ち、doc には参照だけを置く。

export const BranchNode = Node.create({
  name: BRANCH_NODE_NAME,
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => stepIdAttribute,
  parseHTML: () => [{ tag: "div[data-branch]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-branch": "" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(BranchNodeView),
});
