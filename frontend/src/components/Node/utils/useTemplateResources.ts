import { createContext, useContext, useMemo } from "react";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import { collectResourcesBeforeNode, type TemplateResources } from "./collectResources";

// step-list editor (React Flow を持たない) がリソースを直接供給するための差し込み口。
// Provider が無い React Flow ノードでは null となり、従来どおり store + edges から集める。
const TemplateResourcesOverrideContext = createContext<TemplateResources | null>(null);
export const TemplateResourcesOverrideProvider = TemplateResourcesOverrideContext.Provider;

/**
 * Hook to get available resources for the current node.
 */
export function useTemplateResources(nodeId: string): TemplateResources {
  const override = useContext(TemplateResourcesOverrideContext);
  const nodes = useTemplateEditorStore((state) => state.nodes);
  const edges = useTemplateEditorStore((state) => state.edges);

  return useMemo(
    () => override ?? collectResourcesBeforeNode(nodeId, nodes, edges),
    [override, nodeId, nodes, edges],
  );
}
