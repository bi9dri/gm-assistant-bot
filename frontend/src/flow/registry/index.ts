import type { Step } from "../schema";
import type { StepRegistryEntry } from "./types";

import { AddRoleToRoleMembersEntry } from "./AddRoleToRoleMembers";
import { BranchEntry } from "./Branch";
import { ChangeChannelPermissionEntry } from "./ChangeChannelPermission";
import { CombinationSendMessageEntry } from "./CombinationSendMessage";
import { CounterEntry } from "./Counter";
import { CreateCategoryEntry } from "./CreateCategory";
import { CreateChannelEntry } from "./CreateChannel";
import { CreateRoleEntry } from "./CreateRole";
import { DeleteCategoryEntry } from "./DeleteCategory";
import { DeleteChannelEntry } from "./DeleteChannel";
import { DeleteRoleEntry } from "./DeleteRole";
import { KanbanEntry } from "./Kanban";
import { RandomSelectEntry } from "./RandomSelect";
import { RecordCombinationEntry } from "./RecordCombination";
import { SendMessageEntry } from "./SendMessage";
import { SetGameFlagEntry } from "./SetGameFlag";
import { ShuffleAssignEntry } from "./ShuffleAssign";

// 全ステップタイプの登録リスト。ステップタイプを増やす = ここに 1 行追加するだけ。
// 表示順は「操作 → 分岐 → ツール」のおおまかな並び。
const ENTRIES: StepRegistryEntry[] = [
  CreateRoleEntry,
  DeleteRoleEntry,
  CreateCategoryEntry,
  DeleteCategoryEntry,
  CreateChannelEntry,
  DeleteChannelEntry,
  ChangeChannelPermissionEntry,
  AddRoleToRoleMembersEntry,
  SendMessageEntry,
  CombinationSendMessageEntry,
  SetGameFlagEntry,
  BranchEntry,
  KanbanEntry,
  CounterEntry,
  ShuffleAssignEntry,
  RandomSelectEntry,
  RecordCombinationEntry,
];

export const registry = new Map<Step["type"], StepRegistryEntry>(
  ENTRIES.map((entry) => [entry.type, entry]),
);

export const getEntry = (type: Step["type"]): StepRegistryEntry | undefined => registry.get(type);

export const stepTypes = (): Step["type"][] => [...registry.keys()];
