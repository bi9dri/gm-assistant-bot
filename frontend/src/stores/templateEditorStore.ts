import type { Node, Edge, NodeChange, EdgeChange, Connection, Viewport } from "@xyflow/react";
import type { z } from "zod";

import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { create } from "zustand";

import {
  type AddRoleToRoleMembersDataSchema,
  type BlueprintDataSchema,
  type ChangeChannelPermissionDataSchema,
  type CommentDataSchema,
  type ConditionalBranchDataSchema,
  type CreateCategoryDataSchema,
  type CreateChannelDataSchema,
  type CreateRoleDataSchema,
  type DeleteCategoryDataSchema,
  type DeleteChannelDataSchema,
  type DeleteRoleDataSchema,
  type KanbanDataSchema,
  type LabeledGroupDataSchema,
  type RecordCombinationDataSchema,
  type SelectBranchDataSchema,
  type SendMessageDataSchema,
  type SetGameFlagDataSchema,
  type ShuffleAssignDataSchema,
  LABELED_GROUP_DEFAULTS,
} from "@/components/Node";

export type AddRoleToRoleMembersNodeData = z.infer<typeof AddRoleToRoleMembersDataSchema>;
export type BlueprintNodeData = z.infer<typeof BlueprintDataSchema>;
export type ChangeChannelPermissionNodeData = z.infer<typeof ChangeChannelPermissionDataSchema>;
export type CommentNodeData = z.infer<typeof CommentDataSchema>;
export type ConditionalBranchNodeData = z.infer<typeof ConditionalBranchDataSchema>;
export type CreateCategoryNodeData = z.infer<typeof CreateCategoryDataSchema>;
export type CreateChannelNodeData = z.infer<typeof CreateChannelDataSchema>;
export type CreateRoleNodeData = z.infer<typeof CreateRoleDataSchema>;
export type DeleteCategoryNodeData = z.infer<typeof DeleteCategoryDataSchema>;
export type DeleteChannelNodeData = z.infer<typeof DeleteChannelDataSchema>;
export type DeleteRoleNodeData = z.infer<typeof DeleteRoleDataSchema>;
export type KanbanNodeData = z.infer<typeof KanbanDataSchema>;
export type LabeledGroupNodeData = z.infer<typeof LabeledGroupDataSchema>;
export type RecordCombinationNodeData = z.infer<typeof RecordCombinationDataSchema>;
export type SelectBranchNodeData = z.infer<typeof SelectBranchDataSchema>;
export type SendMessageNodeData = z.infer<typeof SendMessageDataSchema>;
export type SetGameFlagNodeData = z.infer<typeof SetGameFlagDataSchema>;
export type ShuffleAssignNodeData = z.infer<typeof ShuffleAssignDataSchema>;

export type FlowNode =
  | Node<AddRoleToRoleMembersNodeData, "AddRoleToRoleMembers">
  | Node<BlueprintNodeData, "Blueprint">
  | Node<ChangeChannelPermissionNodeData, "ChangeChannelPermission">
  | Node<CommentNodeData, "Comment">
  | Node<ConditionalBranchNodeData, "ConditionalBranch">
  | Node<CreateCategoryNodeData, "CreateCategory">
  | Node<CreateChannelNodeData, "CreateChannel">
  | Node<CreateRoleNodeData, "CreateRole">
  | Node<DeleteCategoryNodeData, "DeleteCategory">
  | Node<DeleteChannelNodeData, "DeleteChannel">
  | Node<DeleteRoleNodeData, "DeleteRole">
  | Node<KanbanNodeData, "Kanban">
  | Node<LabeledGroupNodeData, "LabeledGroup">
  | Node<RecordCombinationNodeData, "RecordCombination">
  | Node<SelectBranchNodeData, "SelectBranch">
  | Node<SendMessageNodeData, "SendMessage">
  | Node<SetGameFlagNodeData, "SetGameFlag">
  | Node<ShuffleAssignNodeData, "ShuffleAssign">;

// Helper function: Generate next ID with sequential numbering
const generateNextId = (nodes: FlowNode[], nodeType: string): string => {
  const regex = new RegExp(`^${nodeType}-(\\d+)$`);
  const maxNumber = nodes
    .map((node) => {
      const match = node.id.match(regex);
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .reduce((max, num) => Math.max(max, num), 0);

  return `${nodeType}-${maxNumber + 1}`;
};

interface TemplateEditorState {
  nodes: FlowNode[];
  edges: Edge[];
  viewport: Viewport;
  initialized: boolean;
}

interface TemplateEditorActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (
    nodeId: string,
    data: Partial<
      | AddRoleToRoleMembersNodeData
      | BlueprintNodeData
      | ChangeChannelPermissionNodeData
      | CommentNodeData
      | ConditionalBranchNodeData
      | CreateCategoryNodeData
      | CreateChannelNodeData
      | CreateRoleNodeData
      | DeleteCategoryNodeData
      | DeleteChannelNodeData
      | DeleteRoleNodeData
      | KanbanNodeData
      | LabeledGroupNodeData
      | RecordCombinationNodeData
      | SelectBranchNodeData
      | SendMessageNodeData
      | SetGameFlagNodeData
      | ShuffleAssignNodeData
    >,
  ) => void;
  addNode: (
    type:
      | "AddRoleToRoleMembers"
      | "Blueprint"
      | "ChangeChannelPermission"
      | "Comment"
      | "ConditionalBranch"
      | "CreateCategory"
      | "CreateChannel"
      | "CreateRole"
      | "DeleteCategory"
      | "DeleteChannel"
      | "DeleteRole"
      | "Kanban"
      | "LabeledGroup"
      | "RecordCombination"
      | "SelectBranch"
      | "SendMessage"
      | "SetGameFlag"
      | "ShuffleAssign",
    position: { x: number; y: number },
  ) => void;
  expandBlueprint: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdges: (edgeIds: string[]) => void;
  updateEdgeStyles: (nodeId: string, activeHandleIds: string[]) => void;
  clearEdgeStyles: (nodeId: string) => void;
  setViewport: (viewport: Viewport) => void;
  initialize: (nodes: FlowNode[], edges: Edge[], viewport?: Viewport) => void;
  reset: () => void;
}

type TemplateEditorStore = TemplateEditorState & TemplateEditorActions;

// Zustandストア作成
export const useTemplateEditorStore = create<TemplateEditorStore>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  initialized: false,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as FlowNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? ({ ...node, data: { ...node.data, ...newData } } as FlowNode) : node,
      ),
    });
  },

  addNode: (type, position) => {
    const id = generateNextId(get().nodes, type);
    let newNode: FlowNode;

    if (type === "CreateCategory") {
      newNode = {
        id,
        type,
        position,
        data: { categoryName: { type: "literal", value: "" } },
      };
    } else if (type === "CreateRole") {
      newNode = {
        id,
        type,
        position,
        data: { roles: [""] },
      };
    } else if (type === "CreateChannel") {
      newNode = {
        id,
        type,
        position,
        data: { channels: [] },
      };
    } else if (type === "DeleteCategory") {
      newNode = {
        id,
        type,
        position,
        data: {},
      };
    } else if (type === "DeleteRole") {
      newNode = {
        id,
        type,
        position,
        data: { deleteAll: false, roleNames: [""] },
      };
    } else if (type === "DeleteChannel") {
      newNode = {
        id,
        type,
        position,
        data: { channelNames: [""] },
      };
    } else if (type === "ChangeChannelPermission") {
      newNode = {
        id,
        type,
        position,
        data: { channelName: "", rolePermissions: [] },
      };
    } else if (type === "SendMessage") {
      newNode = {
        id,
        type,
        position,
        data: { channelNames: [""], messages: [{ content: "", attachments: [] }] },
      };
    } else if (type === "Blueprint") {
      newNode = {
        id,
        type,
        position,
        data: {
          parameters: {
            characterNames: [""],
            voiceChannelCount: 0,
            categoryName: "",
            sharedTextChannels: [],
          },
        },
      };
    } else if (type === "SetGameFlag") {
      newNode = {
        id,
        type,
        position,
        data: { flagKey: "", flagValue: "" },
      };
    } else if (type === "LabeledGroup") {
      newNode = {
        id,
        type,
        position,
        data: { label: "" },
        zIndex: -1,
        style: {
          width: LABELED_GROUP_DEFAULTS.width,
          height: LABELED_GROUP_DEFAULTS.height,
        },
      };
    } else if (type === "Comment") {
      newNode = {
        id,
        type,
        position,
        data: { comment: "" },
      };
    } else if (type === "ConditionalBranch") {
      newNode = {
        id,
        type,
        position,
        data: {
          title: "条件分岐",
          conditions: [{ id: crypto.randomUUID(), flagKey: "", operator: "equals", value: "" }],
          hasDefaultBranch: true,
        },
      };
    } else if (type === "RecordCombination") {
      newNode = {
        id,
        type,
        position,
        data: {
          title: "組み合わせを記録",
          config: {
            mode: "same-set",
            allowSelfPairing: false,
            allowDuplicates: false,
            distinguishOrder: true,
            allowMultipleAssignments: false,
          },
          sourceOptions: {
            label: "選択肢A",
            items: [],
          },
          recordedPairs: [],
        },
      };
    } else if (type === "Kanban") {
      newNode = {
        id,
        type,
        position,
        data: {
          title: "カンバン",
          columns: [],
          cards: [],
          initialPlacements: [],
          cardPlacements: [],
        },
      };
    } else if (type === "SelectBranch") {
      newNode = {
        id,
        type,
        position,
        data: {
          title: "選択肢を選ぶ",
          options: [
            { id: crypto.randomUUID(), label: "" },
            { id: crypto.randomUUID(), label: "" },
          ],
          flagName: "",
        },
      };
    } else if (type === "ShuffleAssign") {
      newNode = {
        id,
        type,
        position,
        data: {
          title: "シャッフル割り当て",
          items: [""],
          targets: [""],
          resultFlagPrefix: "",
        },
      };
    } else {
      newNode = {
        id,
        type,
        position,
        data: { memberRoleName: "", addRoleName: "" },
      };
    }

    set({
      nodes: [...get().nodes, newNode],
    });
  },

  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const id = generateNextId(get().nodes, node.type);
    const newNode = {
      ...node,
      id,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      data: structuredClone(node.data),
      selected: false,
      dragging: false,
    } as FlowNode;

    set({
      nodes: [...get().nodes, newNode],
    });
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },

  deleteEdges: (edgeIds) => {
    set({
      edges: get().edges.filter((e) => !edgeIds.includes(e.id)),
    });
  },

  updateEdgeStyles: (nodeId, activeHandleIds) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.source !== nodeId) return edge;

        const isActive = activeHandleIds.includes(edge.sourceHandle ?? "");
        return {
          ...edge,
          style: isActive
            ? { stroke: "#22c55e", strokeWidth: 2.5 }
            : { stroke: "#9ca3af", strokeDasharray: "5 5", opacity: 0.4 },
          animated: isActive,
        };
      }),
    });
  },

  clearEdgeStyles: (nodeId) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.source !== nodeId) return edge;
        const { style: _style, animated: _animated, ...rest } = edge;
        return rest;
      }),
    });
  },

  setViewport: (viewport) => {
    set({ viewport });
  },

  initialize: (nodes, edges, viewport) => {
    set({
      nodes,
      edges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
      initialized: true,
    });
  },

  reset: () => {
    set({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      initialized: false,
    });
  },

  expandBlueprint: (nodeId) => {
    const state = get();
    const blueprintNode = state.nodes.find((n) => n.id === nodeId);
    if (!blueprintNode || blueprintNode.type !== "Blueprint") return;

    const { parameters } = blueprintNode.data as BlueprintNodeData;
    const generatedNodes: FlowNode[] = [];
    const generatedEdges: Edge[] = [];
    const startPosition = blueprintNode.position;

    let currentX = startPosition.x;
    const HORIZONTAL_SPACING = 350;

    let previousNodeId: string | null = null;

    const validCharacters = parameters.characterNames.filter((n) => n.trim());
    const validSharedChannels = parameters.sharedTextChannels.filter((n) => n.trim());

    const sessionPrefix = parameters.categoryName.trim();
    const commonRoles = sessionPrefix
      ? [`${sessionPrefix}PL`, `${sessionPrefix}観戦`]
      : ["PL", "観戦"];
    const allRoles = [...commonRoles, ...validCharacters];

    // 1. Create CreateRoleNode with common roles + character roles
    if (allRoles.length > 0) {
      const roleNodeId = generateNextId(state.nodes.concat(generatedNodes), "CreateRole");
      const roleNode: Node<CreateRoleNodeData, "CreateRole"> = {
        id: roleNodeId,
        type: "CreateRole",
        position: { x: currentX, y: startPosition.y },
        data: { roles: allRoles },
      };
      generatedNodes.push(roleNode);
      previousNodeId = roleNodeId;
      currentX += HORIZONTAL_SPACING;
    }

    // 2. Create CreateCategoryNode if category name is provided
    if (parameters.categoryName.trim()) {
      const categoryNodeId = generateNextId(state.nodes.concat(generatedNodes), "CreateCategory");
      const categoryNode: Node<CreateCategoryNodeData, "CreateCategory"> = {
        id: categoryNodeId,
        type: "CreateCategory",
        position: { x: currentX, y: startPosition.y },
        data: { categoryName: { type: "literal", value: parameters.categoryName.trim() } },
      };
      generatedNodes.push(categoryNode);

      if (previousNodeId) {
        generatedEdges.push({
          id: `${previousNodeId}-${categoryNodeId}`,
          source: previousNodeId,
          target: categoryNodeId,
          sourceHandle: "source-1",
          targetHandle: "target-1",
        });
      }
      previousNodeId = categoryNodeId;
      currentX += HORIZONTAL_SPACING;
    }

    // 3. Create CreateChannelNode with channels
    const channels: CreateChannelNodeData["channels"] = [];

    // Add shared text channels (PL and 観戦 can access)
    for (const channelName of validSharedChannels) {
      channels.push({
        name: channelName,
        type: "text",
        rolePermissions: commonRoles.map((name) => ({ roleName: name, canWrite: true })),
      });
    }

    // Add character-specific text channels (owner can write, 観戦 can read)
    for (const characterName of validCharacters) {
      channels.push({
        name: characterName,
        type: "text",
        rolePermissions: [
          { roleName: characterName, canWrite: true },
          { roleName: "観戦", canWrite: false },
        ],
      });
    }

    // Add voice channels (PL and 観戦 can access)
    for (let i = 1; i <= parameters.voiceChannelCount; i++) {
      channels.push({
        name: `VC-${i}`,
        type: "voice",
        rolePermissions: commonRoles.map((name) => ({ roleName: name, canWrite: true })),
      });
    }

    let channelNodeId: string | null = null;
    if (channels.length > 0) {
      channelNodeId = generateNextId(state.nodes.concat(generatedNodes), "CreateChannel");
      const channelNode: Node<CreateChannelNodeData, "CreateChannel"> = {
        id: channelNodeId,
        type: "CreateChannel",
        position: { x: currentX, y: startPosition.y },
        data: { channels },
      };
      generatedNodes.push(channelNode);

      if (previousNodeId) {
        generatedEdges.push({
          id: `${previousNodeId}-${channelNodeId}`,
          source: previousNodeId,
          target: channelNodeId,
          sourceHandle: "source-1",
          targetHandle: "target-1",
        });
      }
      previousNodeId = channelNodeId;
      currentX += HORIZONTAL_SPACING;
    }

    // 4. Create AddRoleToRoleMembersNode: Add spectator role to PL role members
    const addRoleNodeId = generateNextId(
      state.nodes.concat(generatedNodes),
      "AddRoleToRoleMembers",
    );
    const addRoleNode: Node<AddRoleToRoleMembersNodeData, "AddRoleToRoleMembers"> = {
      id: addRoleNodeId,
      type: "AddRoleToRoleMembers",
      position: { x: currentX, y: startPosition.y },
      data: { memberRoleName: commonRoles[0], addRoleName: commonRoles[1] },
    };
    generatedNodes.push(addRoleNode);

    if (previousNodeId) {
      generatedEdges.push({
        id: `${previousNodeId}-${addRoleNodeId}`,
        source: previousNodeId,
        target: addRoleNodeId,
        sourceHandle: "source-1",
        targetHandle: "target-1",
      });
    }
    previousNodeId = addRoleNodeId;
    currentX += HORIZONTAL_SPACING;

    // 5. Create DeleteCategoryNode
    const deleteCategoryNodeId = generateNextId(
      state.nodes.concat(generatedNodes),
      "DeleteCategory",
    );
    const deleteCategoryNode: Node<DeleteCategoryNodeData, "DeleteCategory"> = {
      id: deleteCategoryNodeId,
      type: "DeleteCategory",
      position: { x: currentX, y: startPosition.y },
      data: {},
    };
    generatedNodes.push(deleteCategoryNode);

    if (previousNodeId) {
      generatedEdges.push({
        id: `${previousNodeId}-${deleteCategoryNodeId}`,
        source: previousNodeId,
        target: deleteCategoryNodeId,
        sourceHandle: "source-1",
        targetHandle: "target-1",
      });
    }
    previousNodeId = deleteCategoryNodeId;
    currentX += HORIZONTAL_SPACING;

    // 6. Create DeleteRoleNode (delete all roles)
    const deleteRoleNodeId = generateNextId(state.nodes.concat(generatedNodes), "DeleteRole");
    const deleteRoleNode: Node<DeleteRoleNodeData, "DeleteRole"> = {
      id: deleteRoleNodeId,
      type: "DeleteRole",
      position: { x: currentX, y: startPosition.y },
      data: { deleteAll: true, roleNames: [] },
    };
    generatedNodes.push(deleteRoleNode);

    if (previousNodeId) {
      generatedEdges.push({
        id: `${previousNodeId}-${deleteRoleNodeId}`,
        source: previousNodeId,
        target: deleteRoleNodeId,
        sourceHandle: "source-1",
        targetHandle: "target-1",
      });
    }

    // Remove blueprint node and add generated nodes
    set({
      nodes: state.nodes.filter((n) => n.id !== nodeId).concat(generatedNodes),
      edges: state.edges.concat(generatedEdges),
    });
  },
}));
