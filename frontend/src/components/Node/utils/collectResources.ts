import type { Edge } from "@xyflow/react";

import type { FlowNode } from "@/stores/templateEditorStore";

export interface TemplateResources {
  roles: Array<{ name: string; sourceNodeId: string }>;
  channels: Array<{ name: string; type: "text" | "voice"; sourceNodeId: string }>;
  gameFlags: Array<{ key: string; values: string[]; sourceNodeId: string }>;
}

/**
 * Collects all resources that would be available before a specific node executes.
 * Traverses the graph backwards from the target node to find all predecessor nodes.
 */
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
      const data = node.data as { flagKey: string; flagValue: string };
      if (data.flagKey.trim()) {
        resources.gameFlags.push({
          key: data.flagKey.trim(),
          values: data.flagValue.trim() ? [data.flagValue.trim()] : [],
          sourceNodeId: node.id,
        });
      }
    } else if (node.type === "SelectBranch") {
      const data = node.data as { flagName: string; options: Array<{ id: string; label: string }> };
      if (data.flagName.trim()) {
        resources.gameFlags.push({
          key: data.flagName.trim(),
          values: data.options.map((o) => o.label).filter((l) => l.trim() !== ""),
          sourceNodeId: node.id,
        });
      }
    } else if (node.type === "ShuffleAssign") {
      const data = node.data as { resultFlagPrefix: string; targets: string[]; items: string[] };
      if (data.resultFlagPrefix.trim()) {
        for (const target of data.targets) {
          if (target.trim()) {
            resources.gameFlags.push({
              key: `${data.resultFlagPrefix.trim()}_${target.trim()}`,
              values: data.items.filter((i) => i.trim() !== ""),
              sourceNodeId: node.id,
            });
          }
        }
      }
    } else if (node.type === "RandomSelect") {
      const data = node.data as { resultFlagKey: string; items: string[] };
      if (data.resultFlagKey.trim()) {
        resources.gameFlags.push({
          key: data.resultFlagKey.trim(),
          values: data.items.filter((i) => i.trim() !== ""),
          sourceNodeId: node.id,
        });
      }
    } else if (node.type === "Counter") {
      const data = node.data as { flagKey: string };
      if (data.flagKey.trim()) {
        resources.gameFlags.push({
          key: data.flagKey.trim(),
          values: [],
          sourceNodeId: node.id,
        });
      }
    }
  }

  return resources;
}
