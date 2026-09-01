import type { JSONContent } from "@tiptap/core";
import { useEditor, type Editor } from "@tiptap/react";

import { scenarioExtensions } from "./extensions";

interface Options {
  doc: JSONContent;
  editable: boolean;
  // 対象レコードが変わったときだけエディタを作り直す。store の doc を毎回流し込むと
  // 日本語入力の composition 中に DOM が差し替わり、変換が壊れる (docs: D23)。
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
      // 貼り付けた本文をそのまま置きたいので、フォーカスは GM が置いた場所に任せる。
      autofocus: false,
      onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
    },
    [recordKey],
  );
