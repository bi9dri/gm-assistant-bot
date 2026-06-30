import { DeleteCategoryStepSchema, type DeleteCategoryStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

// 編集フィールドを持たないステップ。実行時の振る舞いを説明する固定テキストのみ表示する。
const DELETE_CATEGORY_DESCRIPTION = "セッション内の全カテゴリとチャンネルを削除します";

const DeleteCategoryDetailPanel = (_props: DetailPanelProps<DeleteCategoryStep>) => (
  <p className="text-sm text-base-content/60">{DELETE_CATEGORY_DESCRIPTION}</p>
);

export const DeleteCategoryEntry = defineStep<DeleteCategoryStep>({
  type: "DeleteCategory",
  schema: DeleteCategoryStepSchema,
  category: "action",
  defaults: () => ({
    type: "DeleteCategory",
    title: "カテゴリを削除する",
    memo: "",
    autoAdvance: false,
  }),
  summary: () => `カテゴリ削除: ${DELETE_CATEGORY_DESCRIPTION}`,
  DetailPanel: DeleteCategoryDetailPanel,
});
