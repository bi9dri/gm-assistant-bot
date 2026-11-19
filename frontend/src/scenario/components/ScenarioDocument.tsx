import { EditorContent, type Editor } from "@tiptap/react";

import { SCENARIO_DOC_CLASS } from "../scrollTo";

export const ScenarioDocument = ({ editor }: { editor: Editor | null }) => (
  <div className={`${SCENARIO_DOC_CLASS} px-4 py-3`}>
    <EditorContent editor={editor} />
  </div>
);
