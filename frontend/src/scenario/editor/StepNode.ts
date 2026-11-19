import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { STEP_NODE_NAME } from "../schema";
import { StepNodeView } from "./nodeViews";
import { stepIdAttribute } from "./stepIdAttribute";

export const StepNode = Node.create({
  name: STEP_NODE_NAME,
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,
  addAttributes: () => stepIdAttribute,
  parseHTML: () => [{ tag: "span[data-step-id]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes)],
  addNodeView: () => ReactNodeViewRenderer(StepNodeView, { as: "span" }),
});
