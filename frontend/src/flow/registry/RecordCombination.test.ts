import { describe, expect, test } from "bun:test";

import { RecordCombinationStepSchema, type RecordCombinationStep } from "../schema";
import { RecordCombinationEntry } from "./RecordCombination";

type OptionItem = RecordCombinationStep["sourceOptions"]["items"][number];

const option = (id: string, label: string): OptionItem => ({ id, label });

const recordCombinationStep = (
  overrides: Partial<RecordCombinationStep> = {},
): RecordCombinationStep => ({
  id: "record-1",
  type: "RecordCombination",
  title: "組み合わせを記録",
  memo: "",
  autoAdvance: false,
  config: {
    mode: "same-set",
    allowSelfPairing: false,
    allowDuplicates: false,
    distinguishOrder: true,
    allowMultipleAssignments: false,
  },
  sourceOptions: { label: "選択肢A", items: [] },
  recordedPairs: [],
  ...overrides,
});

describe("RecordCombinationEntry.defaults", () => {
  test("schema を満たす初期値を返す", () => {
    const parsed = RecordCombinationStepSchema.parse({
      id: "record-1",
      ...RecordCombinationEntry.defaults(),
    });
    expect(parsed.type).toBe("RecordCombination");
    expect(parsed.config.mode).toBe("same-set");
    expect(parsed.sourceOptions.items).toEqual([]);
    expect(parsed.targetOptions).toBeUndefined();
    expect(parsed.recordedPairs).toEqual([]);
  });
});

describe("RecordCombinationEntry.summary", () => {
  test("未設定 (選択肢が無し) はフォールバック", () => {
    expect(RecordCombinationEntry.summary(recordCombinationStep())).toBe("組み合わせ記録 (未設定)");
  });

  test("same-set は選択肢数のみ表示する", () => {
    const step = recordCombinationStep({
      sourceOptions: { label: "選択肢A", items: [option("a", "A"), option("b", "B")] },
    });
    expect(RecordCombinationEntry.summary(step)).toBe("組み合わせ記録: 2件");
  });

  test("different-set は source×target を表示する", () => {
    const step = recordCombinationStep({
      config: {
        mode: "different-set",
        allowSelfPairing: false,
        allowDuplicates: false,
        distinguishOrder: true,
        allowMultipleAssignments: false,
      },
      sourceOptions: { label: "選択肢A", items: [option("a", "A"), option("b", "B")] },
      targetOptions: { label: "選択肢B", items: [option("x", "X")] },
    });
    expect(RecordCombinationEntry.summary(step)).toBe("組み合わせ記録: 2件×1件");
  });
});
