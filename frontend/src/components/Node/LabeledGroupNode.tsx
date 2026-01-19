import {
  type Node,
  type NodeProps,
  NodeResizer,
  Panel,
  type PanelPosition,
} from "@xyflow/react";
import type { ComponentProps, ReactNode } from "react";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import { BaseNode, cn } from "./base-node";
import { BaseNodeDataSchema, LABELED_GROUP_DEFAULTS } from "./base-schema";

export const DataSchema = BaseNodeDataSchema.extend({
  label: z.string().trim(),
});

type LabeledGroupNodeData = Node<z.infer<typeof DataSchema>, "LabeledGroup">;

/* GROUP NODE Label ------------------------------------------------------- */

type GroupNodeLabelProps = ComponentProps<"div">;

function GroupNodeLabel({ children, className, ...props }: GroupNodeLabelProps) {
  return (
    <div className="h-full w-full" {...props}>
      <div
        className={cn("text-card-foreground bg-secondary w-fit p-2 text-xs font-semibold", className)}
      >
        {children}
      </div>
    </div>
  );
}

type GroupNodeProps = Partial<NodeProps> & {
  label?: ReactNode;
  position?: PanelPosition;
};

function GroupNode({ label, position, selected }: GroupNodeProps) {
  const getLabelClassName = (position?: PanelPosition) => {
    switch (position) {
      case "top-left":
        return "rounded-br-sm";
      case "top-center":
        return "rounded-b-sm";
      case "top-right":
        return "rounded-bl-sm";
      case "bottom-left":
        return "rounded-tr-sm";
      case "bottom-right":
        return "rounded-tl-sm";
      case "bottom-center":
        return "rounded-t-sm";
      default:
        return "rounded-br-sm";
    }
  };

  return (
    <BaseNode
      className={cn(
        "h-full overflow-hidden rounded-sm bg-base-200/50 dark:bg-base-300/30",
        selected && "border-primary",
      )}
    >
      <Panel className="m-0 p-0" position={position}>
        {label && (
          <GroupNodeLabel className={getLabelClassName(position)}>{label}</GroupNodeLabel>
        )}
      </Panel>
    </BaseNode>
  );
}

/* LABELED GROUP NODE ------------------------------------------------------ */

export const LabeledGroupNode = ({
  id,
  data,
  selected,
  mode = "edit",
}: NodeProps<LabeledGroupNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);

  const handleLabelChange = (newValue: string) => {
    updateNodeData(id, { label: newValue });
  };

  const isEditMode = mode === "edit";

  const labelContent = isEditMode ? (
    <input
      type="text"
      className="nodrag input input-ghost input-xs p-0 text-xs font-semibold bg-transparent border-none focus:outline-none min-w-24"
      value={data.label}
      onChange={(evt) => handleLabelChange(evt.target.value)}
      placeholder="グループ名を入力"
    />
  ) : (
    <span>{data.label || "グループ"}</span>
  );

  return (
    <>
      {isEditMode && (
        <NodeResizer
          minWidth={LABELED_GROUP_DEFAULTS.minWidth}
          minHeight={LABELED_GROUP_DEFAULTS.minHeight}
          isVisible={selected}
          lineClassName="border-primary"
          handleClassName="!h-3 !w-3 !bg-primary !border-primary"
        />
      )}
      <GroupNode label={labelContent} position="top-left" selected={selected} />
    </>
  );
};
