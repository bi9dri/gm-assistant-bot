import { createContext, useContext } from "react";

interface TemplateEditorContextValue {
  templateId: number;
}

export const TemplateEditorContext = createContext<TemplateEditorContextValue | null>(null);

export function useTemplateEditorContextOptional() {
  return useContext(TemplateEditorContext);
}
