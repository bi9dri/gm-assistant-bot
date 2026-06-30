import { describe, expect, test } from "bun:test";

import { StepSchema, type Step } from "../schema";
import { getEntry, registry, stepTypes } from "./index";

const STEP_TYPE_COUNT = 17;

describe("registry", () => {
  test("全ステップタイプが登録されている", () => {
    expect(registry.size).toBe(STEP_TYPE_COUNT);
    expect(stepTypes()).toHaveLength(STEP_TYPE_COUNT);
  });

  test("getEntry は type が一致する entry を返す", () => {
    for (const type of stepTypes()) {
      expect(getEntry(type)?.type).toBe(type);
    }
  });

  test("各 entry の defaults() は per-type schema を通過する", () => {
    for (const type of stepTypes()) {
      const entry = getEntry(type);
      if (entry === undefined) throw new Error(`entry missing for ${type}`);
      const step = { ...entry.defaults(), id: "test-id" };
      expect(() => StepSchema.parse(step)).not.toThrow();
    }
  });

  test("各 entry の summary は文字列を返す", () => {
    for (const type of stepTypes()) {
      const entry = getEntry(type);
      if (entry === undefined) throw new Error(`entry missing for ${type}`);
      const step = { ...entry.defaults(), id: "test-id" } as Step;
      expect(typeof entry.summary(step)).toBe("string");
    }
  });
});
