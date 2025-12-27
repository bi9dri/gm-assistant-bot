import {
  type Edge,
  ReactFlow,
  type Node,
  type Connection,
  reconnectEdge,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";

import { NodeTypes } from "@/components/Node";
import { useTemplateEditorStore, type FlowNode } from "@/stores/templateEditorStore";

interface Props {
  nodes: Node[];
  edges: Edge[];
}

export const TemplateEditor = ({ nodes, edges }: Props) => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    initialize,
  } = useTemplateEditorStore();

  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);

  // propsからストアを初期化
  useEffect(() => {
    initialize(nodes as FlowNode[], edges);
  }, [nodes, edges, initialize]);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const updatedEdges = reconnectEdge(oldEdge, newConnection, storeEdges);
      useTemplateEditorStore.setState({ edges: updatedEdges, hasUnsavedChanges: true });
    },
    [storeEdges],
  );

  const handleAddNode = useCallback(() => {
    if (!selectedNodeType) return;

    // 画面中央にノード追加
    const position = { x: 250, y: 250 };
    if (selectedNodeType === "CreateRole") {
      addNode("CreateRole", position);
    }

    // モーダルを閉じる
    const modal = document.getElementById("addNodeModal") as HTMLInputElement;
    if (modal) modal.checked = false;
    setSelectedNodeType(null);
  }, [selectedNodeType, addNode]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        nodes={storeNodes}
        edges={storeEdges}
        nodeTypes={NodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
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
    </div>
  );
};
