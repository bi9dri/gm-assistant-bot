import {
  type Edge,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type Connection,
  type Viewport,
  reconnectEdge,
  useReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import type { DiscordBotData } from "@/db";

import { createNodeTypes } from "@/components/Node";
import { NodeExecutionContext } from "@/components/Node/NodeExecutionContext";
import { useTemplateEditorStore, type FlowNode } from "@/stores/templateEditorStore";

interface Props {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
  mode?: "edit" | "execute";
  guildId?: string;
  sessionId?: number;
  bot?: DiscordBotData;
}

interface ContextMenu {
  nodeId: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

const TemplateEditorContent = ({ nodes, edges, viewport, mode = "edit" }: Props) => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    viewport: storeViewport,
    initialized,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    duplicateNode,
    deleteNode,
    setViewport,
    initialize,
  } = useTemplateEditorStore();

  const { setViewport: rfSetViewport } = useReactFlow();

  const nodeTypes = useMemo(() => createNodeTypes(mode), [mode]);

  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Reconnect成功フラグ（何もない場所にドロップされた場合にEdge削除を判定）
  const edgeReconnectSuccessful = useRef(true);

  useEffect(() => {
    if (!initialized) {
      initialize(nodes as FlowNode[], edges, viewport);
    }
  }, [initialized, initialize]);

  useEffect(() => {
    if (storeViewport) {
      void rfSetViewport(storeViewport, { duration: 0 });
    }
  }, [storeViewport, rfSetViewport]);

  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      setViewport(viewport);
    },
    [setViewport],
  );

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      const updatedEdges = reconnectEdge(oldEdge, newConnection, storeEdges);
      useTemplateEditorStore.setState({ edges: updatedEdges });
    },
    [storeEdges],
  );

  const onReconnectEnd = useCallback((_: unknown, edge: Edge) => {
    if (!edgeReconnectSuccessful.current) {
      // 何もない場所にドロップされた場合、Edgeを削除
      useTemplateEditorStore.setState((state) => ({
        edges: state.edges.filter((e) => e.id !== edge.id),
      }));
    }
    edgeReconnectSuccessful.current = true;
  }, []);

  const handleAddNode = useCallback(() => {
    if (!selectedNodeType) return;

    const position = { x: 250, y: 250 };
    if (selectedNodeType === "CreateRole" || selectedNodeType === "DeleteRole") {
      addNode(selectedNodeType, position);
    }

    const modal = document.getElementById("addNodeModal") as HTMLInputElement;
    if (modal) modal.checked = false;
    setSelectedNodeType(null);
  }, [selectedNodeType, addNode]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();

    const pane = document.querySelector(".react-flow__pane") as HTMLElement;
    if (!pane) return;

    const { top, left, width, height } = pane.getBoundingClientRect();
    const menuWidth = 192; // w-48
    const menuHeight = 100; // estimated height

    setContextMenu({
      nodeId: node.id,
      top: event.clientY - top > height - menuHeight - 20 ? undefined : event.clientY - top,
      left: event.clientX - left > width - menuWidth - 20 ? undefined : event.clientX - left,
      right:
        event.clientX - left > width - menuWidth - 20 ? width - (event.clientX - left) : undefined,
      bottom:
        event.clientY - top > height - menuHeight - 20 ? height - (event.clientY - top) : undefined,
    });
  }, []);

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDuplicate = useCallback(() => {
    if (contextMenu) {
      duplicateNode(contextMenu.nodeId);
      setContextMenu(null);
    }
  }, [contextMenu, duplicateNode]);

  const handleDelete = useCallback(() => {
    if (contextMenu) {
      deleteNode(contextMenu.nodeId);
      setContextMenu(null);
    }
  }, [contextMenu, deleteNode]);

  // Close context menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [contextMenu]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        nodes={storeNodes}
        edges={storeEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        onMoveEnd={handleMoveEnd}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        defaultViewport={storeViewport}
        snapToGrid
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} />
        <Panel position="top-right">
          <label htmlFor="addNodeModal" className="btn btn-outline btn-primary">
            ノード追加
          </label>
        </Panel>
      </ReactFlow>

      <input id="addNodeModal" type="checkbox" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box rounded-xs">
          <h3 className="text-lg font-bold">ノードを追加する</h3>
          <div className="flex flex-wrap gap-4 mt-4">
            <label className="card cursor-pointer">
              <div className="card-body">
                <input
                  type="radio"
                  name="nodeType"
                  value="CreateRole"
                  checked={selectedNodeType === "CreateRole"}
                  onChange={(e) => setSelectedNodeType(e.target.value)}
                  className="radio"
                />
                <span className="ml-2">ロールを作成する</span>
              </div>
            </label>
            <label className="card cursor-pointer">
              <div className="card-body">
                <input
                  type="radio"
                  name="nodeType"
                  value="DeleteRole"
                  checked={selectedNodeType === "DeleteRole"}
                  onChange={(e) => setSelectedNodeType(e.target.value)}
                  className="radio"
                />
                <span className="ml-2">ロールを削除する</span>
              </div>
            </label>
          </div>
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddNode}
              disabled={!selectedNodeType}
            >
              追加
            </button>
            <label htmlFor="addNodeModal" className="btn">
              キャンセル
            </label>
          </div>
        </div>
        <label htmlFor="addNodeModal" className="modal-backdrop">
          キャンセル
        </label>
      </div>

      {contextMenu && (
        <div
          className="absolute z-50 bg-base-100 shadow-lg rounded-xs border border-base-300"
          style={{
            top: contextMenu.top !== undefined ? `${contextMenu.top}px` : undefined,
            left: contextMenu.left !== undefined ? `${contextMenu.left}px` : undefined,
            right: contextMenu.right !== undefined ? `${contextMenu.right}px` : undefined,
            bottom: contextMenu.bottom !== undefined ? `${contextMenu.bottom}px` : undefined,
          }}
        >
          <ul className="menu p-2 w-48">
            <li>
              <button type="button" onClick={handleDuplicate}>
                複製
              </button>
            </li>
            <li>
              <button type="button" onClick={handleDelete}>
                削除
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export const TemplateEditor = (props: Props) => {
  const { mode, guildId, sessionId, bot } = props;

  const content = (
    <ReactFlowProvider>
      <TemplateEditorContent {...props} />
    </ReactFlowProvider>
  );

  if (mode === "execute" && guildId && sessionId && bot) {
    return (
      <NodeExecutionContext.Provider value={{ guildId, sessionId, bot }}>
        {content}
      </NodeExecutionContext.Provider>
    );
  }

  return content;
};
