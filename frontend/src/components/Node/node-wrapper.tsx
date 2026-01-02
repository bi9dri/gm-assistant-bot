import type { NodeProps, NodeTypes } from "@xyflow/react";
import type { ComponentType } from "react";

import { CreateCategoryNode } from "./CreateCategoryNode";
import { CreateRoleNode } from "./CreateRoleNode";
import { DeleteCategoryNode } from "./DeleteCategoryNode";
import { DeleteRoleNode } from "./DeleteRoleNode";

export function createNodeTypes(mode: "edit" | "execute" = "edit"): NodeTypes {
  const CreateCategoryWithMode: ComponentType<NodeProps<any>> = (props) => (
    <CreateCategoryNode {...props} mode={mode} />
  );

  const CreateRoleWithMode: ComponentType<NodeProps<any>> = (props) => (
    <CreateRoleNode {...props} mode={mode} />
  );

  const DeleteRoleWithMode: ComponentType<NodeProps<any>> = (props) => (
    <DeleteRoleNode {...props} mode={mode} />
  );

  const DeleteCategoryWithMode: ComponentType<NodeProps<any>> = (props) => (
    <DeleteCategoryNode {...props} mode={mode} />
  );

  return {
    CreateCategory: CreateCategoryWithMode,
    CreateRole: CreateRoleWithMode,
    DeleteRole: DeleteRoleWithMode,
    DeleteCategory: DeleteCategoryWithMode,
  } as NodeTypes;
}
