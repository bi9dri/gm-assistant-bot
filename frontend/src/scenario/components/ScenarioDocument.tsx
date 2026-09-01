import { EditorContent, type Editor } from "@tiptap/react";

import { SCENARIO_DOC_CLASS } from "../scrollTo";

// 本文カラム。見た目は styles.css の .scenario-doc が持ち、ここは器だけを置く。
export const ScenarioDocument = ({ editor }: { editor: Editor | null }) => (
  <div className={`${SCENARIO_DOC_CLASS} px-4 py-3`}>
    <EditorContent editor={editor} />
  </div>
);
