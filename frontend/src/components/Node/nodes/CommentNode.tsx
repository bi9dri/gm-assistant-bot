import type { Node, NodeProps } from "@xyflow/react";

import { NodeResizer } from "@xyflow/react";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import { BaseNode, BaseNodeContent, BaseNodeDataSchema, COMMENT_DEFAULTS } from "../base";

export const DataSchema = BaseNodeDataSchema.extend({
  comment: z.string(),
});

type CommentNodeData = Node<z.infer<typeof DataSchema>, "Comment">;

export const CommentNode = ({
  id,
  data,
  selected,
  mode = "edit",
}: NodeProps<CommentNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);

  const handleCommentChange = (newValue: string) => {
    updateNodeData(id, { comment: newValue });
  };

  const isEditMode = mode === "edit";

  return (
    <>
      {isEditMode && (
        <NodeResizer
          minWidth={COMMENT_DEFAULTS.minWidth}
          minHeight={COMMENT_DEFAULTS.minHeight}
          isVisible={selected}
          lineClassName="border-info"
          handleClassName="!h-3 !w-3 !bg-info !border-info"
        />
      )}
      <BaseNode className="h-full border-info/50 bg-info/10">
        <BaseNodeContent className="h-full">
          <textarea
            className="nodrag textarea textarea-bordered h-full w-full resize-none"
            value={data.comment}
            onChange={(evt) => handleCommentChange(evt.target.value)}
            placeholder="ワークフローの補足情報を入力..."
            readOnly={!isEditMode}
          />
        </BaseNodeContent>
      </BaseNode>
    </>
  );
};
