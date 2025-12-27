import type { Node, Edge, NodeChange, EdgeChange, Connection } from "@xyflow/react";
import type { z } from "zod";

import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { create } from "zustand";

import type { DataSchema } from "@/components/Node/CreateRoleNode";

// CreateRoleNodeのデータ型
export type CreateRoleNodeData = z.infer<typeof DataSchema>;

// React Flowノード型（カスタムノードタイプ付き）
export type FlowNode = Node<CreateRoleNodeData, "CreateRole">;

// ストア型定義
interface TemplateEditorState {
  nodes: FlowNode[];
  edges: Edge[];
  hasUnsavedChanges: boolean;
}

interface TemplateEditorActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: Partial<CreateRoleNodeData>) => void;
  addNode: (type: "CreateRole", position: { x: number; y: number }) => void;
  initialize: (nodes: FlowNode[], edges: Edge[]) => void;
  reset: () => void;
}

export type TemplateEditorStore = TemplateEditorState & TemplateEditorActions;

// Zustandストア作成
export const useTemplateEditorStore = create<TemplateEditorStore>((set, get) => ({
  nodes: [],
  edges: [],
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
      data: { roles: [""] }, // CreateRoleNodeのデフォルト値
    };
    set({
      nodes: [...get().nodes, newNode],
      hasUnsavedChanges: true,
    });
  },

  initialize: (nodes, edges) => {
    set({
      nodes,
      edges,
      hasUnsavedChanges: false,
    });
  },

  reset: () => {
    set({ nodes: [], edges: [], hasUnsavedChanges: false });
  },
}));
