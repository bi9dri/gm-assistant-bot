import { type Node, type NodeProps, NodeResizer } from "@xyflow/react";
import type { ComponentProps, ReactNode } from "react";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import { BaseNode, cn } from "./base-node";
import { BaseNodeDataSchema, LABELED_GROUP_DEFAULTS } from "./base-schema";

// Available background colors for LabeledGroupNode
export const GROUP_BG_COLORS = [
  { name: "default", value: "", label: "デフォルト" },
  { name: "red", value: "bg-red-500/20", label: "赤" },
  { name: "orange", value: "bg-orange-500/20", label: "オレンジ" },
  { name: "yellow", value: "bg-yellow-500/20", label: "黄" },
  { name: "green", value: "bg-green-500/20", label: "緑" },
  { name: "cyan", value: "bg-cyan-500/20", label: "シアン" },
  { name: "blue", value: "bg-blue-500/20", label: "青" },
  { name: "purple", value: "bg-purple-500/20", label: "紫" },
  { name: "pink", value: "bg-pink-500/20", label: "ピンク" },
] as const;

export const DataSchema = BaseNodeDataSchema.extend({
  label: z.string().trim(),
  bgColor: z.string().optional(),
});

type LabeledGroupNodeData = Node<z.infer<typeof DataSchema>, "LabeledGroup">;

/* GROUP NODE Label ------------------------------------------------------- */

type GroupNodeLabelProps = ComponentProps<"div">;

function GroupNodeLabel({ children, className, ...props }: GroupNodeLabelProps) {
  return (
    <div
      className={cn("text-primary-content bg-primary w-fit p-2 text-xs font-semibold", className)}
      {...props}
    >
      {children}
    </div>
  );
}

type GroupNodeProps = Partial<NodeProps> & {
  label?: ReactNode;
  bgColor?: string;
};

function GroupNode({ label, selected, bgColor }: GroupNodeProps) {
  return (
    <BaseNode
      className={cn(
        "h-full overflow-hidden rounded-sm",
        bgColor || "bg-base-200/50 dark:bg-base-300/30",
        selected && "border-primary",
      )}
    >
      {label && <GroupNodeLabel className="rounded-br-sm">{label}</GroupNodeLabel>}
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

  const handleBgColorChange = (newValue: string) => {
    updateNodeData(id, { bgColor: newValue });
  };

  const isEditMode = mode === "edit";

  const labelContent = isEditMode ? (
    <div className="flex items-center gap-2">
      <input
        type="text"
        className="nodrag input input-ghost input-xs p-0 text-xs font-semibold text-primary-content placeholder:text-primary-content/50 border-none focus:outline-none focus:bg-primary min-w-24"
        value={data.label}
        onChange={(evt) => handleLabelChange(evt.target.value)}
        placeholder="グループ名を入力"
      />
      {selected && (
        <div className="nodrag flex gap-0.5">
          {GROUP_BG_COLORS.map((color) => (
            <button
              key={color.name}
              type="button"
              title={color.label}
              className={cn(
                "w-4 h-4 rounded-sm border border-primary-content/30 hover:scale-110 transition-transform",
                color.value || "bg-base-200/50",
                data.bgColor === color.value && "ring-2 ring-primary-content ring-offset-1",
              )}
              onClick={() => handleBgColorChange(color.value)}
            />
          ))}
        </div>
      )}
    </div>
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
      <GroupNode label={labelContent} selected={selected} bgColor={data.bgColor} />
    </>
  );
};
