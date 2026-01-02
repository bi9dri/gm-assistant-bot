import type { Node, Edge, NodeChange, EdgeChange, Connection, Viewport } from "@xyflow/react";
import type { z } from "zod";

import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { create } from "zustand";

import type { DataSchema as AddRoleToRoleMembersDataSchema } from "@/components/Node/AddRoleToRoleMembersNode";
import type { DataSchema as CreateCategoryDataSchema } from "@/components/Node/CreateCategoryNode";
import type { DataSchema as CreateChannelDataSchema } from "@/components/Node/CreateChannelNode";
import type { DataSchema as CreateRoleDataSchema } from "@/components/Node/CreateRoleNode";
import type { DataSchema as DeleteCategoryDataSchema } from "@/components/Node/DeleteCategoryNode";
import type { DataSchema as DeleteChannelDataSchema } from "@/components/Node/DeleteChannelNode";
import type { DataSchema as DeleteRoleDataSchema } from "@/components/Node/DeleteRoleNode";

export type AddRoleToRoleMembersNodeData = z.infer<typeof AddRoleToRoleMembersDataSchema>;
export type CreateCategoryNodeData = z.infer<typeof CreateCategoryDataSchema>;
export type CreateChannelNodeData = z.infer<typeof CreateChannelDataSchema>;
export type CreateRoleNodeData = z.infer<typeof CreateRoleDataSchema>;
export type DeleteCategoryNodeData = z.infer<typeof DeleteCategoryDataSchema>;
export type DeleteChannelNodeData = z.infer<typeof DeleteChannelDataSchema>;
export type DeleteRoleNodeData = z.infer<typeof DeleteRoleDataSchema>;

export type FlowNode =
  | Node<AddRoleToRoleMembersNodeData, "AddRoleToRoleMembers">
  | Node<CreateCategoryNodeData, "CreateCategory">
  | Node<CreateChannelNodeData, "CreateChannel">
  | Node<CreateRoleNodeData, "CreateRole">
  | Node<DeleteCategoryNodeData, "DeleteCategory">
  | Node<DeleteChannelNodeData, "DeleteChannel">
  | Node<DeleteRoleNodeData, "DeleteRole">;

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
  updateNodeData: (nodeId: string, data: Partial<AddRoleToRoleMembersNodeData | CreateCategoryNodeData | CreateChannelNodeData | CreateRoleNodeData | DeleteCategoryNodeData | DeleteChannelNodeData | DeleteRoleNodeData>) => void;
  addNode: (type: "AddRoleToRoleMembers" | "CreateCategory" | "CreateChannel" | "CreateRole" | "DeleteCategory" | "DeleteChannel" | "DeleteRole", position: { x: number; y: number }) => void;
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
}));
