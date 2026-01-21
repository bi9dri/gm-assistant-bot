import type { Node, Edge, NodeChange, EdgeChange, Connection, Viewport } from "@xyflow/react";
import type { z } from "zod";

import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { create } from "zustand";

import type { DataSchema as AddRoleToRoleMembersDataSchema } from "@/components/Node/AddRoleToRoleMembersNode";
import type { DataSchema as BlueprintDataSchema } from "@/components/Node/BlueprintNode";
import type { DataSchema as ChangeChannelPermissionDataSchema } from "@/components/Node/ChangeChannelPermissionNode";
import type { DataSchema as CommentDataSchema } from "@/components/Node/CommentNode";
import type { DataSchema as CreateCategoryDataSchema } from "@/components/Node/CreateCategoryNode";
import type { DataSchema as CreateChannelDataSchema } from "@/components/Node/CreateChannelNode";
import type { DataSchema as CreateRoleDataSchema } from "@/components/Node/CreateRoleNode";
import type { DataSchema as DeleteCategoryDataSchema } from "@/components/Node/DeleteCategoryNode";
import type { DataSchema as DeleteChannelDataSchema } from "@/components/Node/DeleteChannelNode";
import type { DataSchema as DeleteRoleDataSchema } from "@/components/Node/DeleteRoleNode";
import type { DataSchema as LabeledGroupDataSchema } from "@/components/Node/LabeledGroupNode";
import type { DataSchema as SendMessageDataSchema } from "@/components/Node/SendMessageNode";
import type { DataSchema as SetGameFlagDataSchema } from "@/components/Node/SetGameFlagNode";

import { LABELED_GROUP_DEFAULTS } from "@/components/Node/base-schema";

export type AddRoleToRoleMembersNodeData = z.infer<typeof AddRoleToRoleMembersDataSchema>;
export type BlueprintNodeData = z.infer<typeof BlueprintDataSchema>;
export type ChangeChannelPermissionNodeData = z.infer<typeof ChangeChannelPermissionDataSchema>;
export type CommentNodeData = z.infer<typeof CommentDataSchema>;
export type CreateCategoryNodeData = z.infer<typeof CreateCategoryDataSchema>;
export type CreateChannelNodeData = z.infer<typeof CreateChannelDataSchema>;
export type CreateRoleNodeData = z.infer<typeof CreateRoleDataSchema>;
export type DeleteCategoryNodeData = z.infer<typeof DeleteCategoryDataSchema>;
export type DeleteChannelNodeData = z.infer<typeof DeleteChannelDataSchema>;
export type DeleteRoleNodeData = z.infer<typeof DeleteRoleDataSchema>;
export type LabeledGroupNodeData = z.infer<typeof LabeledGroupDataSchema>;
export type SendMessageNodeData = z.infer<typeof SendMessageDataSchema>;
export type SetGameFlagNodeData = z.infer<typeof SetGameFlagDataSchema>;

export type FlowNode =
  | Node<AddRoleToRoleMembersNodeData, "AddRoleToRoleMembers">
  | Node<BlueprintNodeData, "Blueprint">
  | Node<ChangeChannelPermissionNodeData, "ChangeChannelPermission">
  | Node<CommentNodeData, "Comment">
  | Node<CreateCategoryNodeData, "CreateCategory">
  | Node<CreateChannelNodeData, "CreateChannel">
  | Node<CreateRoleNodeData, "CreateRole">
  | Node<DeleteCategoryNodeData, "DeleteCategory">
  | Node<DeleteChannelNodeData, "DeleteChannel">
  | Node<DeleteRoleNodeData, "DeleteRole">
  | Node<LabeledGroupNodeData, "LabeledGroup">
  | Node<SendMessageNodeData, "SendMessage">
  | Node<SetGameFlagNodeData, "SetGameFlag">;

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
      | CreateCategoryNodeData
      | CreateChannelNodeData
      | CreateRoleNodeData
      | DeleteCategoryNodeData
      | DeleteChannelNodeData
      | DeleteRoleNodeData
      | LabeledGroupNodeData
      | SendMessageNodeData
      | SetGameFlagNodeData
    >,
  ) => void;
  addNode: (
    type:
      | "AddRoleToRoleMembers"
      | "Blueprint"
      | "ChangeChannelPermission"
      | "Comment"
      | "CreateCategory"
      | "CreateChannel"
      | "CreateRole"
      | "DeleteCategory"
      | "DeleteChannel"
      | "DeleteRole"
      | "LabeledGroup"
      | "SendMessage"
      | "SetGameFlag",
    position: { x: number; y: number },
  ) => void;
  expandBlueprint: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  setViewport: (viewport: Viewport) => void;
  initialize: (nodes: FlowNode[], edges: Edge[], viewport?: Viewport) => void;
  reset: () => void;
}

export type TemplateEditorStore = TemplateEditorState & TemplateEditorActions;

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
        data: { categoryName: "" },
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
        data: { channelName: "", messages: [{ content: "", attachments: [] }] },
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

    let currentY = startPosition.y;
    const VERTICAL_SPACING = 200;

    let previousNodeId: string | null = null;

    const validCharacters = parameters.characterNames.filter((n) => n.trim());
    const validSharedChannels = parameters.sharedTextChannels.filter((n) => n.trim());

    // Common roles for Murder Mystery
    const commonRoles = ["PL", "観戦"];
    // All roles including common ones
    const allRoles = [...commonRoles, ...validCharacters];

    // 1. Create CreateRoleNode with common roles + character roles
    if (allRoles.length > 0) {
      const roleNodeId = generateNextId(state.nodes.concat(generatedNodes), "CreateRole");
      const roleNode: Node<CreateRoleNodeData, "CreateRole"> = {
        id: roleNodeId,
        type: "CreateRole",
        position: { x: startPosition.x, y: currentY },
        data: { roles: allRoles },
      };
      generatedNodes.push(roleNode);
      previousNodeId = roleNodeId;
      currentY += VERTICAL_SPACING;
    }

    // 2. Create CreateCategoryNode if category name is provided
    if (parameters.categoryName.trim()) {
      const categoryNodeId = generateNextId(state.nodes.concat(generatedNodes), "CreateCategory");
      const categoryNode: Node<CreateCategoryNodeData, "CreateCategory"> = {
        id: categoryNodeId,
        type: "CreateCategory",
        position: { x: startPosition.x, y: currentY },
        data: { categoryName: parameters.categoryName.trim() },
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
      currentY += VERTICAL_SPACING;
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
        position: { x: startPosition.x, y: currentY },
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
      currentY += VERTICAL_SPACING;
    }

    // 4. Create AddRoleToRoleMembersNode: Add "観戦" role to "PL" role members
    const addRoleNodeId = generateNextId(
      state.nodes.concat(generatedNodes),
      "AddRoleToRoleMembers",
    );
    const addRoleNode: Node<AddRoleToRoleMembersNodeData, "AddRoleToRoleMembers"> = {
      id: addRoleNodeId,
      type: "AddRoleToRoleMembers",
      position: { x: startPosition.x, y: currentY },
      data: { memberRoleName: "PL", addRoleName: "観戦" },
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
    currentY += VERTICAL_SPACING;

    // 5. Create DeleteCategoryNode
    const deleteCategoryNodeId = generateNextId(
      state.nodes.concat(generatedNodes),
      "DeleteCategory",
    );
    const deleteCategoryNode: Node<DeleteCategoryNodeData, "DeleteCategory"> = {
      id: deleteCategoryNodeId,
      type: "DeleteCategory",
      position: { x: startPosition.x, y: currentY },
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
    currentY += VERTICAL_SPACING;

    // 6. Create DeleteRoleNode (delete all roles)
    const deleteRoleNodeId = generateNextId(state.nodes.concat(generatedNodes), "DeleteRole");
    const deleteRoleNode: Node<DeleteRoleNodeData, "DeleteRole"> = {
      id: deleteRoleNodeId,
      type: "DeleteRole",
      position: { x: startPosition.x, y: currentY },
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
