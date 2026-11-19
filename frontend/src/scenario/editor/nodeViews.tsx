import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import { useScenarioChips } from "../components/chips";

const stepIdOf = (props: NodeViewProps): string => String(props.node.attrs.stepId ?? "");

export const StepNodeView = (props: NodeViewProps) => {
  const { Step } = useScenarioChips();
  return (
    <NodeViewWrapper as="span" className="align-baseline" data-drag-handle="">
      <Step stepId={stepIdOf(props)} />
    </NodeViewWrapper>
  );
};

export const BranchNodeView = (props: NodeViewProps) => {
  const { Branch } = useScenarioChips();
  return (
    <NodeViewWrapper className="my-2" data-drag-handle="">
      <Branch stepId={stepIdOf(props)} />
    </NodeViewWrapper>
  );
};
