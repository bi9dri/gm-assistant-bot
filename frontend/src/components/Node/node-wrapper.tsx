import type { NodeProps, NodeTypes } from "@xyflow/react";
import type { ComponentType } from "react";

import { AddRoleToRoleMembersNode } from "./AddRoleToRoleMembersNode";
import { ChangeChannelPermissionNode } from "./ChangeChannelPermissionNode";
import { CreateCategoryNode } from "./CreateCategoryNode";
import { CreateChannelNode } from "./CreateChannelNode";
import { CreateRoleNode } from "./CreateRoleNode";
import { DeleteCategoryNode } from "./DeleteCategoryNode";
import { DeleteChannelNode } from "./DeleteChannelNode";
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

  const CreateChannelWithMode: ComponentType<NodeProps<any>> = (props) => (
    <CreateChannelNode {...props} mode={mode} />
  );

  const DeleteChannelWithMode: ComponentType<NodeProps<any>> = (props) => (
    <DeleteChannelNode {...props} mode={mode} />
  );

  const ChangeChannelPermissionWithMode: ComponentType<NodeProps<any>> = (props) => (
    <ChangeChannelPermissionNode {...props} mode={mode} />
  );

  const AddRoleToRoleMembersWithMode: ComponentType<NodeProps<any>> = (props) => (
    <AddRoleToRoleMembersNode {...props} mode={mode} />
  );

  return {
    CreateCategory: CreateCategoryWithMode,
    CreateRole: CreateRoleWithMode,
    DeleteRole: DeleteRoleWithMode,
    DeleteCategory: DeleteCategoryWithMode,
    CreateChannel: CreateChannelWithMode,
    DeleteChannel: DeleteChannelWithMode,
    ChangeChannelPermission: ChangeChannelPermissionWithMode,
    AddRoleToRoleMembers: AddRoleToRoleMembersWithMode,
  } as NodeTypes;
}
