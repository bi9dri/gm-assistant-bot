import { DynamicValueInput, defaultDynamicValue } from "@/components/Node/utils";
import { resolveDynamicValue } from "@/components/Node/utils/DynamicValue";

import { CreateCategoryStepSchema, type CreateCategoryStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const describeCategoryName = (value: CreateCategoryStep["categoryName"]): string => {
  switch (value.type) {
    case "literal":
      return value.value.trim();
    case "session.name":
      return "セッション名";
    case "roleRef":
      return value.roleName.trim();
    case "channelRef":
      return value.channelName.trim();
    case "gameFlag":
      return value.flagKey.trim() !== "" ? `フラグ:${value.flagKey.trim()}` : "";
    default:
      return "";
  }
};

const CreateCategoryDetailPanel = ({ step, onChange }: DetailPanelProps<CreateCategoryStep>) => (
  <DynamicValueInput
    nodeId={step.id}
    value={step.categoryName}
    onChange={(categoryName) => onChange({ categoryName })}
    placeholder="カテゴリ名を入力"
  />
);

export const CreateCategoryEntry = defineStep<CreateCategoryStep>({
  type: "CreateCategory",
  schema: CreateCategoryStepSchema,
  category: "action",
  defaults: () => ({
    type: "CreateCategory",
    title: "カテゴリを作成する",
    memo: "",
    autoAdvance: false,
    categoryName: defaultDynamicValue(),
  }),
  summary: (step) => {
    const name = describeCategoryName(step.categoryName);
    return name !== "" ? `カテゴリ作成: ${name}` : "カテゴリ作成 (未設定)";
  },
  DetailPanel: CreateCategoryDetailPanel,
  execute: async (step, ctx) => {
    const name = resolveDynamicValue(step.categoryName, {
      sessionName: ctx.sessionName,
      roles: new Map(ctx.resources.roles.map((role) => [role.name, role.id])),
      channels: new Map(ctx.resources.channels.map((channel) => [channel.name, channel.id])),
      gameFlags: ctx.flags.get(),
    }).trim();
    if (name === "") return { status: "error", message: "カテゴリ名を入力してください" };

    try {
      const category = await ctx.discord.createCategory(name);
      await ctx.resources.addCategory({ id: category.id, name: category.name });
      return { status: "success", message: `カテゴリ「${category.name}」を作成しました` };
    } catch {
      return { status: "error", message: "カテゴリの作成に失敗しました" };
    }
  },
});
