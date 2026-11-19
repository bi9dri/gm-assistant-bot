import z from "zod";

import { DynamicValueSchema } from "@/components/Node/utils/DynamicValue";
import type { ConditionNode } from "@/components/Node/utils/evaluateCondition";
import { MessageBlockSchema } from "@/components/Node/utils/messageSchema";

const RuleNodeSchema = z.object({
  type: z.literal("rule"),
  id: z.string(),
  flagKey: z.string(),
  operator: z.enum(["equals", "notEquals", "contains", "exists", "notExists"]),
  value: z.string(),
  valueType: z.enum(["literal", "flag"]).default("literal"),
});

const ConditionNodeSchema: z.ZodType<ConditionNode> = z.union([
  RuleNodeSchema,
  z.object({
    type: z.literal("group"),
    id: z.string(),
    logic: z.enum(["and", "or"]),
    children: z.lazy(() => ConditionNodeSchema.array().min(1)),
  }),
]);

const StepBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  memo: z.string().default(""),
  autoAdvance: z.boolean().default(false),
  executedAt: z.coerce.date().optional(),
});

const CreateRoleStepSchema = StepBaseSchema.extend({
  type: z.literal("CreateRole"),
  roles: z.array(z.string().nonempty().trim()),
});

const DeleteRoleStepSchema = StepBaseSchema.extend({
  type: z.literal("DeleteRole"),
  deleteAll: z.boolean(),
  roleNames: z.array(z.string().trim()),
});

const CreateCategoryStepSchema = StepBaseSchema.extend({
  type: z.literal("CreateCategory"),
  categoryName: DynamicValueSchema,
});

const DeleteCategoryStepSchema = StepBaseSchema.extend({
  type: z.literal("DeleteCategory"),
});

const RolePermissionSchema = z.object({
  roleName: z.string().trim(),
  canWrite: z.boolean(),
});

const CreateChannelStepSchema = StepBaseSchema.extend({
  type: z.literal("CreateChannel"),
  channels: z.array(
    z.object({
      name: z.string().trim(),
      type: z.enum(["text", "voice"]),
      rolePermissions: z.array(RolePermissionSchema),
    }),
  ),
});

const DeleteChannelStepSchema = StepBaseSchema.extend({
  type: z.literal("DeleteChannel"),
  channelNames: z.array(z.string().trim()),
});

const ChangeChannelPermissionStepSchema = StepBaseSchema.extend({
  type: z.literal("ChangeChannelPermission"),
  channelName: z.string().trim(),
  rolePermissions: z.array(RolePermissionSchema),
});

const AddRoleToRoleMembersStepSchema = StepBaseSchema.extend({
  type: z.literal("AddRoleToRoleMembers"),
  memberRoleName: z.string().trim(),
  addRoleName: z.string().trim(),
});

const ChannelTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("channelName"), value: z.string().trim() }),
  z.object({ type: z.literal("flagKey"), value: z.string().trim() }),
]);

const SendMessageStepSchema = StepBaseSchema.extend({
  type: z.literal("SendMessage"),
  channelTargets: z.array(ChannelTargetSchema).min(1),
  messages: z.array(MessageBlockSchema).min(1),
});

const CombinationSendMessageStepSchema = StepBaseSchema.extend({
  type: z.literal("CombinationSendMessage"),
  entries: z
    .array(
      z.object({
        id: z.string(),
        channelName: z.string().trim().default(""),
        messages: z.array(MessageBlockSchema).min(1),
        collapsed: z.boolean().default(false),
      }),
    )
    .min(1),
});

const SetGameFlagStepSchema = StepBaseSchema.extend({
  type: z.literal("SetGameFlag"),
  flagKey: z.string().trim(),
  flagValue: z.string().trim(),
  flagKeyOptions: z.array(z.string().trim()).default([]),
  flagValueOptions: z.array(z.string().trim()).default([]),
});

const KanbanLabeledItemSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const KanbanStepSchema = StepBaseSchema.extend({
  type: z.literal("Kanban"),
  columns: z.array(KanbanLabeledItemSchema).default([]),
  cards: z.array(KanbanLabeledItemSchema).default([]),
  initialPlacements: z.array(z.object({ cardId: z.string(), columnId: z.string() })).default([]),
  cardPlacements: z
    .array(z.object({ cardId: z.string(), columnId: z.string(), movedAt: z.coerce.date() }))
    .default([]),
});

const CounterStepSchema = StepBaseSchema.extend({
  type: z.literal("Counter"),
  flagKey: z.string().trim(),
  step: z.number().int().positive().default(1),
});

const ShuffleAssignStepSchema = StepBaseSchema.extend({
  type: z.literal("ShuffleAssign"),
  items: z.array(z.string().min(1)).min(1),
  targets: z.array(z.string().min(1)).min(1),
  resultFlagPrefix: z.string().trim().min(1),
  assignedResults: z.record(z.string(), z.array(z.string())).optional(),
});

const RandomSelectStepSchema = StepBaseSchema.extend({
  type: z.literal("RandomSelect"),
  items: z.array(z.string().min(1)).min(1),
  resultFlagKey: z.string().trim().min(1),
  selectedItem: z.string().optional(),
});

const RecordCombinationStepSchema = StepBaseSchema.extend({
  type: z.literal("RecordCombination"),
  config: z.object({
    mode: z.enum(["same-set", "different-set"]),
    allowSelfPairing: z.boolean().default(false),
    allowDuplicates: z.boolean().default(false),
    distinguishOrder: z.boolean().default(true),
    allowMultipleAssignments: z.boolean().default(false),
  }),
  sourceOptions: z.object({
    label: z.string().default("選択肢A"),
    items: z.array(KanbanLabeledItemSchema),
  }),
  targetOptions: z
    .object({
      label: z.string().default("選択肢B"),
      items: z.array(KanbanLabeledItemSchema),
    })
    .optional(),
  recordedPairs: z
    .array(
      z.object({
        id: z.string(),
        sourceId: z.string(),
        targetId: z.string(),
        recordedAt: z.coerce.date(),
        memo: z.string().optional(),
      }),
    )
    .default([]),
});

const TextStepSchema = StepBaseSchema.extend({
  type: z.literal("Text"),
  body: z.string().default(""),
});

export type BranchArm = {
  id: string;
  label: string;
  condition?: ConditionNode;
  steps: Step[];
};

const BranchArmSchema: z.ZodType<BranchArm> = z.object({
  id: z.string(),
  label: z.string(),
  condition: ConditionNodeSchema.optional(),
  steps: z.lazy(() => z.array(StepSchema)),
});

const BranchStepSchema = StepBaseSchema.extend({
  type: z.literal("Branch"),
  mode: z.enum(["auto", "select"]),
  matchMode: z.enum(["first", "all"]).default("first"),
  flagName: z.string().default(""),
  branches: z.array(BranchArmSchema).min(1),
  executedBranchIds: z.array(z.string()).optional(),
});

const StepUnionSchema = z.discriminatedUnion("type", [
  CreateRoleStepSchema,
  DeleteRoleStepSchema,
  CreateCategoryStepSchema,
  DeleteCategoryStepSchema,
  CreateChannelStepSchema,
  DeleteChannelStepSchema,
  ChangeChannelPermissionStepSchema,
  AddRoleToRoleMembersStepSchema,
  SendMessageStepSchema,
  CombinationSendMessageStepSchema,
  SetGameFlagStepSchema,
  KanbanStepSchema,
  CounterStepSchema,
  ShuffleAssignStepSchema,
  RandomSelectStepSchema,
  RecordCombinationStepSchema,
  TextStepSchema,
  BranchStepSchema,
]);

export const StepSchema = StepUnionSchema.superRefine((step, ctx) => {
  if (step.type !== "Branch") return;

  if (step.mode === "select") {
    step.branches.forEach((branchArm, index) => {
      if (branchArm.condition !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "select モードの枝は条件を持てません",
          path: ["branches", index, "condition"],
        });
      }
    });
    return;
  }

  const defaultArmIndexes = step.branches.flatMap((branchArm, index) =>
    branchArm.condition === undefined ? [index] : [],
  );
  if (defaultArmIndexes.length > 1) {
    ctx.addIssue({
      code: "custom",
      message: "デフォルト枝 (条件なし) は1つまでです",
      path: ["branches"],
    });
  } else if (defaultArmIndexes.length === 1 && defaultArmIndexes[0] !== step.branches.length - 1) {
    ctx.addIssue({
      code: "custom",
      message: "デフォルト枝 (条件なし) は末尾にのみ置けます",
      path: ["branches", defaultArmIndexes[0]],
    });
  }
});

const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  memo: z.string().default(""),
  collapsed: z.boolean().default(false),
  steps: z.array(StepSchema),
});

export const FlowDataSchema = z.object({
  version: z.literal(1),
  sections: z.array(SectionSchema),
});

export type Step = z.infer<typeof StepSchema>;
export type FlowData = z.infer<typeof FlowDataSchema>;

export const defaultFlowData: FlowData = { version: 1, sections: [] };

export {
  AddRoleToRoleMembersStepSchema,
  BranchStepSchema,
  ChangeChannelPermissionStepSchema,
  CombinationSendMessageStepSchema,
  CounterStepSchema,
  CreateCategoryStepSchema,
  CreateChannelStepSchema,
  CreateRoleStepSchema,
  DeleteCategoryStepSchema,
  DeleteChannelStepSchema,
  DeleteRoleStepSchema,
  KanbanStepSchema,
  RandomSelectStepSchema,
  RecordCombinationStepSchema,
  SendMessageStepSchema,
  SetGameFlagStepSchema,
  ShuffleAssignStepSchema,
  TextStepSchema,
};

export type CreateRoleStep = Extract<Step, { type: "CreateRole" }>;
export type DeleteRoleStep = Extract<Step, { type: "DeleteRole" }>;
export type CreateCategoryStep = Extract<Step, { type: "CreateCategory" }>;
export type DeleteCategoryStep = Extract<Step, { type: "DeleteCategory" }>;
export type CreateChannelStep = Extract<Step, { type: "CreateChannel" }>;
export type DeleteChannelStep = Extract<Step, { type: "DeleteChannel" }>;
export type ChangeChannelPermissionStep = Extract<Step, { type: "ChangeChannelPermission" }>;
export type AddRoleToRoleMembersStep = Extract<Step, { type: "AddRoleToRoleMembers" }>;
export type SendMessageStep = Extract<Step, { type: "SendMessage" }>;
export type CombinationSendMessageStep = Extract<Step, { type: "CombinationSendMessage" }>;
export type SetGameFlagStep = Extract<Step, { type: "SetGameFlag" }>;
export type KanbanStep = Extract<Step, { type: "Kanban" }>;
export type CounterStep = Extract<Step, { type: "Counter" }>;
export type ShuffleAssignStep = Extract<Step, { type: "ShuffleAssign" }>;
export type RandomSelectStep = Extract<Step, { type: "RandomSelect" }>;
export type RecordCombinationStep = Extract<Step, { type: "RecordCombination" }>;
export type BranchStep = Extract<Step, { type: "Branch" }>;
export type TextStep = Extract<Step, { type: "Text" }>;
