import { createContext, useContext } from "react";

interface TemplateEditorContextValue {
  templateId: number;
}

export const TemplateEditorContext = createContext<TemplateEditorContextValue | null>(null);

export function useTemplateEditorContext() {
  const context = useContext(TemplateEditorContext);
  if (!context) {
    throw new Error("useTemplateEditorContext must be used within TemplateEditorContext.Provider");
  }
  return context;
}

export function useTemplateEditorContextOptional() {
  return useContext(TemplateEditorContext);
}
