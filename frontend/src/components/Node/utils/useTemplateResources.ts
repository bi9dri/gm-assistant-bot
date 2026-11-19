import { createContext, useContext, useMemo } from "react";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import { collectResourcesBeforeNode, type TemplateResources } from "./collectResources";

const TemplateResourcesOverrideContext = createContext<TemplateResources | null>(null);
export const TemplateResourcesOverrideProvider = TemplateResourcesOverrideContext.Provider;

export function useTemplateResources(nodeId: string): TemplateResources {
  const override = useContext(TemplateResourcesOverrideContext);
  const nodes = useTemplateEditorStore((state) => state.nodes);
  const edges = useTemplateEditorStore((state) => state.edges);

  return useMemo(
    () => override ?? collectResourcesBeforeNode(nodeId, nodes, edges),
    [override, nodeId, nodes, edges],
  );
}
