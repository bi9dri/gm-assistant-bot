import type { Node, Edge, NodeChange, EdgeChange, Connection, Viewport } from "@xyflow/react";
import type { z } from "zod";

import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { create } from "zustand";

import type { DataSchema } from "@/components/Node/CreateRoleNode";

export type CreateRoleNodeData = z.infer<typeof DataSchema>;

export type FlowNode = Node<CreateRoleNodeData, "CreateRole">;

interface TemplateEditorState {
  nodes: FlowNode[];
  edges: Edge[];
  viewport: Viewport;
  hasUnsavedChanges: boolean;
}

interface TemplateEditorActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: Partial<CreateRoleNodeData>) => void;
  addNode: (type: "CreateRole", position: { x: number; y: number }) => void;
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
  hasUnsavedChanges: false,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as FlowNode[],
      hasUnsavedChanges: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      hasUnsavedChanges: true,
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
      hasUnsavedChanges: true,
    });
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node,
      ),
      hasUnsavedChanges: true,
    });
  },

  addNode: (type, position) => {
    const newNode: FlowNode = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { roles: [""] },
    };
    set({
      nodes: [...get().nodes, newNode],
      hasUnsavedChanges: true,
    });
  },

  setViewport: (viewport) => {
    set({
      viewport,
      hasUnsavedChanges: true,
    });
  },

  initialize: (nodes, edges, viewport) => {
    set({
      nodes,
      edges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
      hasUnsavedChanges: false,
    });
  },

  reset: () => {
    set({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      hasUnsavedChanges: false,
    });
  },
}));
