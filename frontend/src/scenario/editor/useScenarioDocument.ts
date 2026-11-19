import type { JSONContent } from "@tiptap/core";
import { useEditor, type Editor } from "@tiptap/react";

import { scenarioExtensions } from "./extensions";

interface Options {
  doc: JSONContent;
  editable: boolean;
  recordKey: number | null;
  onChange?: (doc: JSONContent) => void;
}

export const useScenarioDocument = ({
  doc,
  editable,
  recordKey,
  onChange,
}: Options): Editor | null =>
  useEditor(
    {
      extensions: scenarioExtensions,
      content: doc,
      editable,
      autofocus: false,
      onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
    },
    [recordKey],
  );
