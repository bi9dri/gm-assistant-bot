import Highlight from "@tiptap/extension-highlight";
import StarterKit from "@tiptap/starter-kit";

import { BranchNode } from "./BranchNode";
import { StepNode } from "./StepNode";

export const scenarioExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    italic: false,
    strike: false,
    underline: false,
  }),
  Highlight,
  StepNode,
  BranchNode,
];
