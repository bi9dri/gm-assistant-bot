import type { NodeProps, NodeTypes } from "@xyflow/react";
import type { ComponentType } from "react";

import { AddRoleToRoleMembersNode } from "./AddRoleToRoleMembersNode";
import { BlueprintNode } from "./BlueprintNode";
import { ChangeChannelPermissionNode } from "./ChangeChannelPermissionNode";
import { CommentNode } from "./CommentNode";
import { CreateCategoryNode } from "./CreateCategoryNode";
import { CreateChannelNode } from "./CreateChannelNode";
import { CreateRoleNode } from "./CreateRoleNode";
import { DeleteCategoryNode } from "./DeleteCategoryNode";
import { DeleteChannelNode } from "./DeleteChannelNode";
import { DeleteRoleNode } from "./DeleteRoleNode";
import { SendMessageNode } from "./SendMessageNode";
import { SetGameFlagNode } from "./SetGameFlagNode";

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

  const SendMessageWithMode: ComponentType<NodeProps<any>> = (props) => (
    <SendMessageNode {...props} mode={mode} />
  );

  const BlueprintWithMode: ComponentType<NodeProps<any>> = (props) => (
    <BlueprintNode {...props} mode={mode} />
  );

  const SetGameFlagWithMode: ComponentType<NodeProps<any>> = (props) => (
    <SetGameFlagNode {...props} mode={mode} />
  );

  const CommentWithMode: ComponentType<NodeProps<any>> = (props) => (
    <CommentNode {...props} mode={mode} />
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
    SendMessage: SendMessageWithMode,
    Blueprint: BlueprintWithMode,
    SetGameFlag: SetGameFlagWithMode,
    Comment: CommentWithMode,
  } as NodeTypes;
}
