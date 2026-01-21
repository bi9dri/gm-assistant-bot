import type { NodeProps, NodeTypes } from "@xyflow/react";
import type { ComponentType } from "react";

import {
  AddRoleToRoleMembersNode,
  BlueprintNode,
  ChangeChannelPermissionNode,
  CommentNode,
  CreateCategoryNode,
  CreateChannelNode,
  CreateRoleNode,
  DeleteCategoryNode,
  DeleteChannelNode,
  DeleteRoleNode,
  KanbanNode,
  LabeledGroupNode,
  RecordCombinationNode,
  SendMessageNode,
  SetGameFlagNode,
} from "../nodes";

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

  const LabeledGroupWithMode: ComponentType<NodeProps<any>> = (props) => (
    <LabeledGroupNode {...props} mode={mode} />
  );

  const CommentWithMode: ComponentType<NodeProps<any>> = (props) => (
    <CommentNode {...props} mode={mode} />
  );

  const RecordCombinationWithMode: ComponentType<NodeProps<any>> = (props) => (
    <RecordCombinationNode {...props} mode={mode} />
  );

  const KanbanWithMode: ComponentType<NodeProps<any>> = (props) => (
    <KanbanNode {...props} mode={mode} />
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
    LabeledGroup: LabeledGroupWithMode,
    Comment: CommentWithMode,
    RecordCombination: RecordCombinationWithMode,
    Kanban: KanbanWithMode,
  } as NodeTypes;
}
