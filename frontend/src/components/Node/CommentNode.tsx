import { Position, type Node, type NodeProps } from "@xyflow/react";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "./base-node";
import { BaseNodeDataSchema, NODE_TYPE_WIDTHS } from "./base-schema";

export const DataSchema = BaseNodeDataSchema.extend({
  comment: z.string(),
});

type CommentNodeData = Node<z.infer<typeof DataSchema>, "Comment">;

export const CommentNode = ({
  id,
  data,
  mode: _mode = "edit",
}: NodeProps<CommentNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);

  const handleCommentChange = (newValue: string) => {
    updateNodeData(id, { comment: newValue });
  };

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.Comment}
      className="border-info/50 bg-info/10"
    >
      <BaseNodeHeader className="bg-info/20">
        <BaseNodeHeaderTitle>コメント</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <textarea
          className="nodrag textarea textarea-bordered w-full resize-none"
          rows={4}
          value={data.comment}
          onChange={(evt) => handleCommentChange(evt.target.value)}
          placeholder="ワークフローの補足情報を入力..."
        />
      </BaseNodeContent>
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
