import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import { useScenarioChips } from "../components/chips";

// ProseMirror ノード ↔ React の境界。実体の描画は context 越しのチップに委ね、
// ここは stepId を取り出して包むだけにする。

const stepIdOf = (props: NodeViewProps): string => String(props.node.attrs.stepId ?? "");

// 文中のインラインアトム (D24)。段落の折り返しに乗るよう span で包む。
export const StepNodeView = (props: NodeViewProps) => {
  const { Step } = useScenarioChips();
  return (
    <NodeViewWrapper as="span" className="align-baseline">
      <Step stepId={stepIdOf(props)} />
    </NodeViewWrapper>
  );
};

// ブロックレベルの分岐 (D24 の例外)。
export const BranchNodeView = (props: NodeViewProps) => {
  const { Branch } = useScenarioChips();
  return (
    <NodeViewWrapper className="my-2">
      <Branch stepId={stepIdOf(props)} />
    </NodeViewWrapper>
  );
};
