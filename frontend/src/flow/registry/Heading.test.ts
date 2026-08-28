import { describe, expect, test } from "bun:test";

import type { HeadingStep } from "../schema";
import { HeadingEntry } from "./Heading";

const headingStep = (overrides: Partial<HeadingStep>): HeadingStep =>
  ({
    ...HeadingEntry.defaults(),
    id: "h1",
    ...overrides,
  }) as HeadingStep;

describe("Heading summary", () => {
  test("レベルとタイトルを並べる", () => {
    expect(HeadingEntry.summary(headingStep({ level: 2, title: "第1章" }))).toBe("H2 第1章");
  });

  test("タイトルが空ならプレースホルダを返す", () => {
    expect(HeadingEntry.summary(headingStep({ level: 1, title: "  " }))).toBe("H1 (無題)");
  });
});
