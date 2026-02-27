import { useMemo } from "react";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import { collectResourcesBeforeNode, type TemplateResources } from "./collectResources";

export type { TemplateResources };

/**
 * Hook to get available resources for the current node.
 */
export function useTemplateResources(nodeId: string): TemplateResources {
  const nodes = useTemplateEditorStore((state) => state.nodes);
  const edges = useTemplateEditorStore((state) => state.edges);

  return useMemo(() => collectResourcesBeforeNode(nodeId, nodes, edges), [nodeId, nodes, edges]);
}
