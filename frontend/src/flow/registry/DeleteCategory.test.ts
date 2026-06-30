import { describe, expect, test } from "bun:test";

import type { DeleteCategoryStep } from "../schema";

import { DeleteCategoryEntry } from "./DeleteCategory";

const step = (overrides: Partial<DeleteCategoryStep> = {}): DeleteCategoryStep => ({
  id: "step-1",
  type: "DeleteCategory",
  title: "カテゴリを削除する",
  memo: "",
  autoAdvance: false,
  ...overrides,
});

describe("DeleteCategoryEntry.summary", () => {
  // 編集フィールドを持たないため、設定値によらず固定の説明文を返す。
  test("固定の説明文を返す", () => {
    expect(DeleteCategoryEntry.summary(step())).toBe(
      "カテゴリ削除: セッション内の全カテゴリとチャンネルを削除します",
    );
  });

  test("title を変えても summary は変わらない", () => {
    expect(DeleteCategoryEntry.summary(step({ title: "別タイトル" }))).toBe(
      DeleteCategoryEntry.summary(step()),
    );
  });
});
