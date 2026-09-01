import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import { useScenarioChips } from "../components/chips";

// ProseMirror ノード ↔ React の境界。実体の描画は context 越しのチップに委ね、
// ここは stepId を取り出して包むだけにする。

const stepIdOf = (props: NodeViewProps): string => String(props.node.attrs.stepId ?? "");

// data-drag-handle: Tiptap の既定 stopEvent はこの属性を掴んだ mousedown でしか
// ドラッグを許さず、無いと node の draggable 宣言に関わらず dragstart を握り潰す。
// チップは 1 行サマリだけの小さな要素なので、掴む場所を限らずラッパ全体を handle にする。

// 文中のインラインアトム (D24)。段落の折り返しに乗るよう span で包む。
export const StepNodeView = (props: NodeViewProps) => {
  const { Step } = useScenarioChips();
  return (
    <NodeViewWrapper as="span" className="align-baseline" data-drag-handle="">
      <Step stepId={stepIdOf(props)} />
    </NodeViewWrapper>
  );
};

// ブロックレベルの分岐 (D24 の例外)。
export const BranchNodeView = (props: NodeViewProps) => {
  const { Branch } = useScenarioChips();
  return (
    <NodeViewWrapper className="my-2" data-drag-handle="">
      <Branch stepId={stepIdOf(props)} />
    </NodeViewWrapper>
  );
};
