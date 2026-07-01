import { describe, expect, test } from "bun:test";

import type { CreateCategoryStep } from "../schema";

import { CreateCategoryEntry } from "./CreateCategory";

const step = (overrides: Partial<CreateCategoryStep> = {}): CreateCategoryStep => ({
  id: "step-1",
  type: "CreateCategory",
  title: "カテゴリを作成する",
  memo: "",
  autoAdvance: false,
  categoryName: { type: "literal", value: "" },
  ...overrides,
});

describe("CreateCategoryEntry.summary", () => {
  test("literal の値を表示する", () => {
    expect(
      CreateCategoryEntry.summary(
        step({ categoryName: { type: "literal", value: "探索フェーズ" } }),
      ),
    ).toBe("カテゴリ作成: 探索フェーズ");
  });

  test("session.name は『セッション名』と表示する", () => {
    expect(CreateCategoryEntry.summary(step({ categoryName: { type: "session.name" } }))).toBe(
      "カテゴリ作成: セッション名",
    );
  });

  test("gameFlag はフラグ名を表示する", () => {
    expect(
      CreateCategoryEntry.summary(step({ categoryName: { type: "gameFlag", flagKey: "章" } })),
    ).toBe("カテゴリ作成: フラグ:章");
  });

  test("空の literal はフォールバック文を返す", () => {
    expect(
      CreateCategoryEntry.summary(step({ categoryName: { type: "literal", value: "  " } })),
    ).toBe("カテゴリ作成 (未設定)");
  });

  // step() の categoryName 既定値は entry.defaults() (literal 空文字) と同形。
  test("既定値 (literal 空文字) は未設定扱いになる", () => {
    expect(CreateCategoryEntry.summary(step())).toBe("カテゴリ作成 (未設定)");
  });
});
