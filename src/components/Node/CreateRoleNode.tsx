import { Position, type Node, type NodeProps } from "@xyflow/react";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "./base-node";

export const DataSchema = z.object({
  roles: z.array(z.string().nonempty().trim()),
});
type CreateRoleNodeData = Node<z.infer<typeof DataSchema>, "CreateRole">;

export const CreateRoleNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<CreateRoleNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);

  const handleRoleChange = (index: number, newValue: string) => {
    const updatedRoles = [...data.roles];
    updatedRoles[index] = newValue;
    updateNodeData(id, { roles: updatedRoles });
  };

  const handleAddRole = () => {
    updateNodeData(id, { roles: [...data.roles, ""] });
  };

  const handleRemoveRole = (index: number) => {
    const updatedRoles = data.roles.filter((_, i) => i !== index);
    updateNodeData(id, { roles: updatedRoles });
  };

  return (
    <BaseNode className="bg-base-300">
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>ロールを作成する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        {data.roles.map((role, index) => (
          <div key={`${id}-role-${index}`} className="flex gap-2 items-center mb-2">
            <input
              type="text"
              className="input input-bordered w-full"
              value={role}
              onChange={(evt) => handleRoleChange(index, evt.target.value)}
              placeholder="ロール名を入力"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleRemoveRole(index)}
            >
              削除
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={handleAddRole}>
          ロールを追加
        </button>
      </BaseNodeContent>
      {mode === "execute" && (
        <BaseNodeFooter>
          <button type="button" className="btn btn-primary">
            作成
          </button>
        </BaseNodeFooter>
      )}
      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
