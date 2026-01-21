import {
  type Edge,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type Connection,
  type Viewport,
  reconnectEdge,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import type { DiscordBotData } from "@/db";

import { createNodeTypes } from "@/components/Node";
import { NodeExecutionContext } from "@/components/Node/NodeExecutionContext";
import { TemplateEditorContext } from "@/components/Node/TemplateEditorContext";
import { useTemplateEditorStore, type FlowNode } from "@/stores/templateEditorStore";

interface Props {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
  mode?: "edit" | "execute";
  templateId?: number;
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

const NODE_CATEGORIES = [
  {
    category: "ブループリント",
    nodes: [{ type: "Blueprint", label: "マーダーミステリー基本セット" }],
  },
  {
    category: "整理",
    nodes: [{ type: "LabeledGroup", label: "グループ" }],
  },
  {
    category: "ロール",
    nodes: [
      { type: "CreateRole", label: "ロールを作成する" },
      { type: "DeleteRole", label: "ロールを削除する" },
      { type: "AddRoleToRoleMembers", label: "ロールメンバーにロールを付与" },
    ],
  },
  {
    category: "カテゴリ",
    nodes: [
      { type: "CreateCategory", label: "カテゴリを作成する" },
      { type: "DeleteCategory", label: "カテゴリを削除する" },
    ],
  },
  {
    category: "チャンネル",
    nodes: [
      { type: "CreateChannel", label: "チャンネルを作成する" },
      { type: "DeleteChannel", label: "チャンネルを削除する" },
      { type: "ChangeChannelPermission", label: "チャンネル権限を変更する" },
    ],
  },
  {
    category: "メッセージ",
    nodes: [{ type: "SendMessage", label: "メッセージを送信する" }],
  },
  {
    category: "ゲーム管理",
    nodes: [{ type: "SetGameFlag", label: "ゲームフラグを設定する" }],
  },
  {
    category: "その他",
    nodes: [{ type: "Comment", label: "コメント" }],
  },
] as const;

type NodeType = (typeof NODE_CATEGORIES)[number]["nodes"][number]["type"];

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

  const { screenToFlowPosition } = useReactFlow();
  const nodeTypes = useMemo(() => createNodeTypes(mode), [mode]);

  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Reconnect成功フラグ（何もない場所にドロップされた場合にEdge削除を判定）
  const edgeReconnectSuccessful = useRef(true);

  useEffect(() => {
    if (!initialized) {
      initialize(nodes as FlowNode[], edges, viewport);
    }
  }, [initialized, initialize, nodes, edges, viewport]);

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

    // Get the center of the current viewport
    const pane = document.querySelector(".react-flow__pane") as HTMLElement;
    if (!pane) return;

    const { width, height } = pane.getBoundingClientRect();
    const centerX = width / 2;
    const centerY = height / 2;

    // Convert screen position to flow position
    const position = screenToFlowPosition({ x: centerX, y: centerY });

    addNode(selectedNodeType as NodeType, position);

    const modal = document.getElementById("addNodeModal") as HTMLInputElement;
    if (modal) modal.checked = false;
    setSelectedNodeType(null);
  }, [selectedNodeType, addNode, screenToFlowPosition]);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const { top, left, width, height } = container.getBoundingClientRect();
    const menuWidth = 192; // w-48
    const menuHeight = 100; // estimated height
    const padding = 20;

    // Calculate click position relative to pane
    const clickX = event.clientX - left;
    const clickY = event.clientY - top;

    // Check available space in each direction
    const hasSpaceRight = clickX + menuWidth + padding <= width;
    const hasSpaceBottom = clickY + menuHeight + padding <= height;
    const hasSpaceLeft = clickX - menuWidth - padding >= 0;
    const hasSpaceTop = clickY - menuHeight - padding >= 0;

    // Determine menu position based on priority: bottom-right → top-right → bottom-left → top-left
    let menuTop: number | undefined;
    let menuLeft: number | undefined;
    let menuRight: number | undefined;
    let menuBottom: number | undefined;

    if (hasSpaceRight && hasSpaceBottom) {
      // Bottom-right (default)
      menuTop = clickY;
      menuLeft = clickX;
    } else if (hasSpaceRight && hasSpaceTop) {
      // Top-right
      menuBottom = height - clickY;
      menuLeft = clickX;
    } else if (hasSpaceLeft && hasSpaceBottom) {
      // Bottom-left
      menuTop = clickY;
      menuRight = width - clickX;
    } else if (hasSpaceLeft && hasSpaceTop) {
      // Top-left
      menuBottom = height - clickY;
      menuRight = width - clickX;
    } else {
      // Fallback: position at click point (may overflow)
      menuTop = clickY;
      menuLeft = clickX;
    }

    setContextMenu({
      nodeId: node.id,
      top: menuTop,
      left: menuLeft,
      right: menuRight,
      bottom: menuBottom,
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
    <div ref={containerRef} className="relative w-full h-full">
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
          <div className="join join-vertical w-full mt-4">
            {NODE_CATEGORIES.map(({ category, nodes }) => (
              <div
                key={category}
                className="collapse collapse-arrow join-item border-base-300 border"
              >
                <input type="radio" name="nodeCategory" />
                <div className="collapse-title font-medium">{category}</div>
                <div className="collapse-content">
                  <div className="flex flex-col gap-2 pt-2">
                    {nodes.map(({ type, label }) => (
                      <label
                        key={type}
                        className={`rounded-box border-2 cursor-pointer transition-colors flex items-center p-3 ${
                          selectedNodeType === type
                            ? "bg-primary/10 border-primary"
                            : "bg-base-200 border-transparent hover:border-base-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="nodeType"
                          value={type}
                          checked={selectedNodeType === type}
                          onChange={(e) => setSelectedNodeType(e.target.value)}
                          className="hidden"
                        />
                        <span className="font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
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
  const { mode, templateId, guildId, sessionId, bot } = props;

  const content = (
    <ReactFlowProvider>
      <TemplateEditorContent {...props} />
    </ReactFlowProvider>
  );

  // Wrap with TemplateEditorContext when templateId is available
  const withTemplateContext = templateId ? (
    <TemplateEditorContext.Provider value={{ templateId }}>
      {content}
    </TemplateEditorContext.Provider>
  ) : (
    content
  );

  if (mode === "execute" && guildId && sessionId && bot) {
    return (
      <NodeExecutionContext.Provider value={{ guildId, sessionId, bot }}>
        {withTemplateContext}
      </NodeExecutionContext.Provider>
    );
  }

  return withTemplateContext;
};
