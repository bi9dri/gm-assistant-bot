import type { Edge } from "@xyflow/react";

import { useMemo } from "react";

import { useTemplateEditorStore, type FlowNode } from "@/stores/templateEditorStore";

interface TemplateResources {
  roles: Array<{ name: string; sourceNodeId: string }>;
  channels: Array<{ name: string; type: "text" | "voice"; sourceNodeId: string }>;
  gameFlags: Array<{ key: string; sourceNodeId: string }>;
}

/**
 * Collects all resources that would be available before a specific node executes.
 * Traverses the graph backwards from the target node to find all predecessor nodes.
 */
function collectResourcesBeforeNode(
  targetNodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
): TemplateResources {
  const resources: TemplateResources = {
    roles: [],
    channels: [],
    gameFlags: [],
  };

  const predecessors = new Set<string>();
  const visited = new Set<string>();
  const queue = [targetNodeId];

  const incomingEdges = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = incomingEdges.get(edge.target) ?? [];
    existing.push(edge.source);
    incomingEdges.set(edge.target, existing);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const incoming = incomingEdges.get(currentId) ?? [];
    for (const sourceId of incoming) {
      predecessors.add(sourceId);
      queue.push(sourceId);
    }
  }

  for (const node of nodes) {
    if (!predecessors.has(node.id)) continue;

    if (node.type === "CreateRole") {
      const data = node.data as { roles: string[] };
      for (const roleName of data.roles) {
        if (roleName.trim()) {
          resources.roles.push({ name: roleName.trim(), sourceNodeId: node.id });
        }
      }
    } else if (node.type === "CreateChannel") {
      const data = node.data as { channels: Array<{ name: string; type: "text" | "voice" }> };
      for (const channel of data.channels) {
        if (channel.name.trim()) {
          resources.channels.push({
            name: channel.name.trim(),
            type: channel.type,
            sourceNodeId: node.id,
          });
        }
      }
    } else if (node.type === "SetGameFlag") {
      const data = node.data as { flagKey: string };
      if (data.flagKey.trim()) {
        resources.gameFlags.push({ key: data.flagKey.trim(), sourceNodeId: node.id });
      }
    }
  }

  return resources;
}

/**
 * Hook to get available resources for the current node.
 */
export function useTemplateResources(nodeId: string): TemplateResources {
  const nodes = useTemplateEditorStore((state) => state.nodes);
  const edges = useTemplateEditorStore((state) => state.edges);

  return useMemo(() => collectResourcesBeforeNode(nodeId, nodes, edges), [nodeId, nodes, edges]);
}
