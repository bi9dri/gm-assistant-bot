import z from "zod";

import type { ConditionNode } from "@/components/Node/utils/evaluateCondition";

import { DynamicValueSchema } from "@/components/Node/utils/DynamicValue";
import { MessageBlockSchema } from "@/components/Node/utils/messageSchema";

// ステップツリー型データモデル (issue #182 / #183)。
// reactFlowData (ノード+エッジ+座標) を置き換える新表現で、
// Section[] > Step[] のネスト JSON を丸ごと保存する。座標・viewport は持たない。

// ---- 条件ツリー (旧 ConditionalBranchNode と同形。型は evaluateCondition と共有) ----

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

// ---- ステップ共通フィールド ----

const StepBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  // GM 向けメモ。旧 Comment ノードの吸収先でもある
  memo: z.string().default(""),
  // 連鎖実行: 実行完了後に次のステップを自動実行する
  autoAdvance: z.boolean().default(false),
  executedAt: z.coerce.date().optional(),
});

// ---- アクション系ステップ (Discord 操作) ----

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
});

// ---- ツール系ステップ (Discord 操作を伴わないフラグ操作 UI) ----

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

// ---- 分岐ステップ (旧 ConditionalBranch / SelectBranch を統合) ----

type BranchArm = {
  id: string;
  label: string;
  // auto モードの評価条件。未指定の枝はデフォルト枝 (else) として末尾にのみ置ける
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
  // auto: 条件ツリーで自動評価 / select: GM が選択肢から選ぶ
  mode: z.enum(["auto", "select"]),
  // auto モード: "all" はマッチした全枝を上から順に実行してから合流する
  matchMode: z.enum(["first", "all"]).default("first"),
  // select モード: 選択結果を書き込むゲームフラグ名
  flagName: z.string().default(""),
  branches: z.array(BranchArmSchema).min(1),
  // 実行状態: 実行された (auto) / 選択された (select) 枝の id
  executedBranchIds: z.array(z.string()).optional(),
});

// ---- ステップ / セクション / フロー全体 ----

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
