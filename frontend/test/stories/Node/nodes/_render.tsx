import type { ComponentType, CSSProperties } from "react";

import { ReactFlow, ReactFlowProvider, type Node, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface RenderSingleNodeOptions<TData extends Record<string, unknown>> {
  type: string;
  Component: ComponentType<any>;
  data: TData;
  width?: number;
  height?: number;
  containerStyle?: CSSProperties;
}

const DEFAULT_CONTAINER_STYLE: CSSProperties = { width: 1200, height: 600 };

// Renders a single React Flow custom node inside a minimal `<ReactFlow>` so that
// handles / NodeResizer / internal state work correctly. Viewport, pan, zoom are
// all locked to keep VRT snapshots deterministic.
export function renderSingleNode<TData extends Record<string, unknown>>({
  type,
  Component,
  data,
  width,
  height,
  containerStyle,
}: RenderSingleNodeOptions<TData>) {
  const nodes: Node[] = [
    {
      id: `${type}-1`,
      type,
      position: { x: 40, y: 40 },
      data,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
    },
  ];
  const nodeTypes: NodeTypes = { [type]: Component };

  return (
    <ReactFlowProvider>
      <div style={{ ...DEFAULT_CONTAINER_STYLE, ...containerStyle }}>
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        />
      </div>
    </ReactFlowProvider>
  );
}
