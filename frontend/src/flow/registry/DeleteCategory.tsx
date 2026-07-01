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
  execute: async (_step, ctx) => {
    const { channels, categories } = ctx.resources;
    if (categories.length === 0)
      return { status: "success", message: "削除するカテゴリはありません" };

    const total = channels.length + categories.length;
    const failed: string[] = [];
    // resources を splice する remove* と反復が競合しないよう、対象はコピーで回す。
    // チャンネルを先に消してからカテゴリを消す (旧 DeleteCategoryNode と同順)。
    for (const channel of channels.slice()) {
      try {
        await ctx.discord.deleteChannel(channel.id);
        await ctx.resources.removeChannel(channel.id);
      } catch {
        failed.push(channel.name);
      }
    }
    for (const category of categories.slice()) {
      try {
        await ctx.discord.deleteChannel(category.id);
        await ctx.resources.removeCategory(category.id);
      } catch {
        failed.push(category.name);
      }
    }
    if (failed.length > 0) {
      return { status: "error", message: `削除に失敗しました: ${failed.join(", ")}` };
    }
    return { status: "success", message: `${total}件のリソースを削除しました` };
  },
});
