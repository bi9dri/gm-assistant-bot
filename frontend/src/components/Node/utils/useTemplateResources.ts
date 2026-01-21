import type { Edge } from "@xyflow/react";

import { useMemo } from "react";

import { useTemplateEditorStore, type FlowNode } from "@/stores/templateEditorStore";

export interface TemplateResources {
  roles: Array<{ name: string; sourceNodeId: string }>;
  channels: Array<{ name: string; type: "text" | "voice"; sourceNodeId: string }>;
  gameFlags: Array<{ key: string; sourceNodeId: string }>;
}

export function buildIncomingEdgesMap(edges: Edge[]): Map<string, string[]> {
  const incomingEdges = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = incomingEdges.get(edge.target) ?? [];
    existing.push(edge.source);
    incomingEdges.set(edge.target, existing);
  }
  return incomingEdges;
}

export function findPredecessorNodes(
  targetNodeId: string,
  incomingEdgesMap: Map<string, string[]>,
): Set<string> {
  const predecessors = new Set<string>();
  const visited = new Set<string>();
  const queue = [targetNodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const incoming = incomingEdgesMap.get(currentId) ?? [];
    for (const sourceId of incoming) {
      predecessors.add(sourceId);
      queue.push(sourceId);
    }
  }

  return predecessors;
}

export function extractResourcesFromNode(node: FlowNode): Partial<TemplateResources> {
  const nodeId = node.id;

  switch (node.type) {
    case "CreateRole": {
      const data = node.data as { roles: string[] };
      const roles = data.roles
        .filter((roleName) => roleName.trim() !== "")
        .map((roleName) => ({ name: roleName.trim(), sourceNodeId: nodeId }));
      return roles.length > 0 ? { roles } : {};
    }
    case "CreateChannel": {
      const data = node.data as { channels: Array<{ name: string; type: "text" | "voice" }> };
      const channels = data.channels
        .filter((channel) => channel.name.trim() !== "")
        .map((channel) => ({
          name: channel.name.trim(),
          type: channel.type,
          sourceNodeId: nodeId,
        }));
      return channels.length > 0 ? { channels } : {};
    }
    case "SetGameFlag": {
      const data = node.data as { flagKey: string };
      if (data.flagKey.trim()) {
        return { gameFlags: [{ key: data.flagKey.trim(), sourceNodeId: nodeId }] };
      }
      return {};
    }
    default:
      return {};
  }
}

export function mergeResources(
  base: TemplateResources,
  partial: Partial<TemplateResources>,
): TemplateResources {
  if (partial.roles) {
    base.roles.push(...partial.roles);
  }
  if (partial.channels) {
    base.channels.push(...partial.channels);
  }
  if (partial.gameFlags) {
    base.gameFlags.push(...partial.gameFlags);
  }
  return base;
}

export function collectResourcesBeforeNode(
  targetNodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
): TemplateResources {
  const resources: TemplateResources = {
    roles: [],
    channels: [],
    gameFlags: [],
  };

  const incomingEdgesMap = buildIncomingEdgesMap(edges);
  const predecessors = findPredecessorNodes(targetNodeId, incomingEdgesMap);

  for (const node of nodes) {
    if (!predecessors.has(node.id)) continue;
    mergeResources(resources, extractResourcesFromNode(node));
  }

  return resources;
}

export function useTemplateResources(nodeId: string): TemplateResources {
  const nodes = useTemplateEditorStore((state) => state.nodes);
  const edges = useTemplateEditorStore((state) => state.edges);

  return useMemo(() => collectResourcesBeforeNode(nodeId, nodes, edges), [nodeId, nodes, edges]);
}

export function useAllTemplateResources(): TemplateResources {
  const nodes = useTemplateEditorStore((state) => state.nodes);

  return useMemo(() => {
    const resources: TemplateResources = {
      roles: [],
      channels: [],
      gameFlags: [],
    };

    for (const node of nodes) {
      mergeResources(resources, extractResourcesFromNode(node));
    }

    return resources;
  }, [nodes]);
}
