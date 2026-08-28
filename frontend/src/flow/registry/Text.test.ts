import { describe, expect, test } from "bun:test";

import type { TextStep } from "../schema";
import { TextEntry } from "./Text";

const textStep = (body: string): TextStep =>
  ({
    ...TextEntry.defaults(),
    id: "t1",
    body,
  }) as TextStep;

describe("Text summary", () => {
  test("本文の最初の非空行を返す", () => {
    expect(TextEntry.summary(textStep("\n  導入シーン  \n続き"))).toBe("導入シーン");
  });

  test("空の本文はプレースホルダを返す", () => {
    expect(TextEntry.summary(textStep("   \n\n"))).toBe("本文 (空)");
  });

  test("長い行は省略記号付きで切り詰める", () => {
    const summary = TextEntry.summary(textStep("あ".repeat(50)));

    expect(summary).toBe(`${"あ".repeat(40)}…`);
  });
});
