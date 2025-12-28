import type { NodeProps, NodeTypes } from "@xyflow/react";
import type { ComponentType } from "react";

import { CreateRoleNode } from "./CreateRoleNode";

export function createNodeTypes(mode: "edit" | "execute" = "edit"): NodeTypes {
  const CreateRoleWithMode: ComponentType<NodeProps<any>> = (props) => (
    <CreateRoleNode {...props} mode={mode} />
  );

  return {
    CreateRole: CreateRoleWithMode,
  } as NodeTypes;
}
