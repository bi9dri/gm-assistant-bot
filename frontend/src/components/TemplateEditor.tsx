import {
  type Edge,
  ReactFlow,
  type Node as FlowNode,
  useNodesState,
  useEdgesState,
  type Connection,
  reconnectEdge,
  addEdge,
  Controls,
  Background,
  BackgroundVariant,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { useCallback } from "react";

interface Props {
  templateId: number;
}

export const TemplateEditor = ({ templateId }: Props) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgeChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((els) => addEdge(params, els)),
    [],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) =>
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    [],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgeChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        snapToGrid
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  );
};
