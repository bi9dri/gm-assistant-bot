import type { NodeProps, NodeTypes } from "@xyflow/react";
import type { ComponentType } from "react";

import { CreateRoleNode } from "./CreateRoleNode";
import { DeleteRoleNode } from "./DeleteRoleNode";

export function createNodeTypes(mode: "edit" | "execute" = "edit"): NodeTypes {
  const CreateRoleWithMode: ComponentType<NodeProps<any>> = (props) => (
    <CreateRoleNode {...props} mode={mode} />
  );

  const DeleteRoleWithMode: ComponentType<NodeProps<any>> = (props) => (
    <DeleteRoleNode {...props} mode={mode} />
  );

  return {
    CreateRole: CreateRoleWithMode,
    DeleteRole: DeleteRoleWithMode,
  } as NodeTypes;
}
