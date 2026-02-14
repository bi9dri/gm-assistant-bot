import { describe, test, expect } from "bun:test";

import {
  getFilteredTargetOptions,
  validatePair,
  type OptionItem,
  type RecordedPair,
  type CombinationConfig,
} from "./recordCombination";

describe("getFilteredTargetOptions", () => {
  const createOption = (id: string, label: string): OptionItem => ({ id, label });
  const createPair = (sourceId: string, targetId: string): RecordedPair => ({
    id: crypto.randomUUID(),
    sourceId,
    targetId,
    recordedAt: new Date(),
  });

  describe("same-set mode", () => {
    const config: CombinationConfig = {
      mode: "same-set",
      allowSelfPairing: false,
      allowDuplicates: false,
      distinguishOrder: true,
      allowMultipleAssignments: false,
    };

    test("disables self-pairing when not allowed", () => {
      const options = [createOption("1", "A"), createOption("2", "B")];
      const result = getFilteredTargetOptions(config, options, undefined, [], "1");

      expect(result[0]).toMatchObject({
        id: "1",
        isDisabled: true,
        disabledReason: "自分自身とはペアになれません",
      });
      expect(result[1]).toMatchObject({ id: "2", isDisabled: false, disabledReason: "" });
    });

    test("allows self-pairing when allowed", () => {
      const allowSelfConfig = { ...config, allowSelfPairing: true };
      const options = [createOption("1", "A")];
      const result = getFilteredTargetOptions(allowSelfConfig, options, undefined, [], "1");

      expect(result[0]).toMatchObject({ id: "1", isDisabled: false, disabledReason: "" });
    });

    test("disables duplicate pairs with distinguishOrder=true", () => {
      const options = [createOption("1", "A"), createOption("2", "B")];
      const pairs = [createPair("1", "2")];
      const result = getFilteredTargetOptions(config, options, undefined, pairs, "1");

      expect(result[1]).toMatchObject({
        id: "2",
        isDisabled: true,
        disabledReason: "既に記録済みです",
      });
    });

    test("distinguishes order (A→B ≠ B→A) when distinguishOrder=true", () => {
      const options = [createOption("1", "A"), createOption("2", "B")];
      const pairs = [createPair("1", "2")];
      const result = getFilteredTargetOptions(config, options, undefined, pairs, "2");

      expect(result[0]).toMatchObject({ id: "1", isDisabled: false, disabledReason: "" });
    });

    test("does not distinguish order (A-B = B-A) when distinguishOrder=false", () => {
      const noOrderConfig = { ...config, distinguishOrder: false };
      const options = [createOption("1", "A"), createOption("2", "B")];
      const pairs = [createPair("1", "2")];
      const result = getFilteredTargetOptions(noOrderConfig, options, undefined, pairs, "2");

      expect(result[0]).toMatchObject({
        id: "1",
        isDisabled: true,
        disabledReason: "既に記録済みです",
      });
    });

    test("allows duplicate pairs when allowDuplicates=true", () => {
      const allowDupConfig = { ...config, allowDuplicates: true };
      const options = [createOption("1", "A"), createOption("2", "B")];
      const pairs = [createPair("1", "2")];
      const result = getFilteredTargetOptions(allowDupConfig, options, undefined, pairs, "1");

      expect(result[1]).toMatchObject({ id: "2", isDisabled: false, disabledReason: "" });
    });
  });

  describe("different-set mode", () => {
    const config: CombinationConfig = {
      mode: "different-set",
      allowSelfPairing: false,
      allowDuplicates: false,
      distinguishOrder: true,
      allowMultipleAssignments: false,
    };

    test("uses targetOptions instead of sourceOptions", () => {
      const sourceOptions = [createOption("1", "A"), createOption("2", "B")];
      const targetOptions = [createOption("3", "X"), createOption("4", "Y")];
      const result = getFilteredTargetOptions(config, sourceOptions, targetOptions, [], "1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: "3", label: "X" });
      expect(result[1]).toMatchObject({ id: "4", label: "Y" });
    });

    test("returns empty array when targetOptions is undefined", () => {
      const sourceOptions = [createOption("1", "A")];
      const result = getFilteredTargetOptions(config, sourceOptions, undefined, [], "1");

      expect(result).toEqual([]);
    });

    test("disables duplicate pairs", () => {
      const sourceOptions = [createOption("1", "A")];
      const targetOptions = [createOption("3", "X"), createOption("4", "Y")];
      const pairs = [createPair("1", "3")];
      const result = getFilteredTargetOptions(config, sourceOptions, targetOptions, pairs, "1");

      expect(result[0]).toMatchObject({
        id: "3",
        isDisabled: true,
        disabledReason: "既に記録済みです",
      });
      expect(result[1]).toMatchObject({ id: "4", isDisabled: false });
    });
  });

  describe("edge cases", () => {
    const config: CombinationConfig = {
      mode: "same-set",
      allowSelfPairing: false,
      allowDuplicates: false,
      distinguishOrder: true,
      allowMultipleAssignments: false,
    };

    test("handles empty options", () => {
      const result = getFilteredTargetOptions(config, [], undefined, [], null);
      expect(result).toEqual([]);
    });

    test("handles null selectedSourceId", () => {
      const options = [createOption("1", "A"), createOption("2", "B")];
      const result = getFilteredTargetOptions(config, options, undefined, [], null);

      expect(result).toHaveLength(2);
      result.forEach((opt) => {
        expect(opt.isDisabled).toBe(false);
      });
    });
  });
});

describe("validatePair", () => {
  const createPair = (sourceId: string, targetId: string): RecordedPair => ({
    id: crypto.randomUUID(),
    sourceId,
    targetId,
    recordedAt: new Date(),
  });

  const config: CombinationConfig = {
    mode: "same-set",
    allowSelfPairing: false,
    allowDuplicates: false,
    distinguishOrder: true,
    allowMultipleAssignments: false,
  };

  describe("validation rules", () => {
    test("rejects empty sourceId", () => {
      const result = validatePair(config, [], "", "2");
      expect(result).toEqual({ valid: false, error: "両方を選択してください" });
    });

    test("rejects empty targetId", () => {
      const result = validatePair(config, [], "1", "");
      expect(result).toEqual({ valid: false, error: "両方を選択してください" });
    });

    test("rejects both empty", () => {
      const result = validatePair(config, [], "", "");
      expect(result).toEqual({ valid: false, error: "両方を選択してください" });
    });

    test("rejects self-pairing in same-set mode when not allowed", () => {
      const result = validatePair(config, [], "1", "1");
      expect(result).toEqual({ valid: false, error: "自分自身とはペアになれません" });
    });

    test("allows self-pairing when allowed", () => {
      const allowSelfConfig = { ...config, allowSelfPairing: true };
      const result = validatePair(allowSelfConfig, [], "1", "1");
      expect(result).toEqual({ valid: true });
    });

    test("does not check self-pairing in different-set mode", () => {
      const differentSetConfig = { ...config, mode: "different-set" as const };
      const result = validatePair(differentSetConfig, [], "1", "1");
      expect(result).toEqual({ valid: true });
    });

    test("rejects duplicate pairs when distinguishOrder=true", () => {
      const pairs = [createPair("1", "2")];
      const result = validatePair(config, pairs, "1", "2");
      expect(result).toEqual({ valid: false, error: "このペアは既に記録されています" });
    });

    test("allows reverse pairs (B→A) when distinguishOrder=true", () => {
      const pairs = [createPair("1", "2")];
      const result = validatePair(config, pairs, "2", "1");
      expect(result).toEqual({ valid: true });
    });

    test("rejects reverse pairs when distinguishOrder=false", () => {
      const noOrderConfig = { ...config, distinguishOrder: false };
      const pairs = [createPair("1", "2")];
      const result = validatePair(noOrderConfig, pairs, "2", "1");
      expect(result).toEqual({ valid: false, error: "このペアは既に記録されています" });
    });

    test("allows duplicate pairs when allowDuplicates=true", () => {
      const allowDupConfig = { ...config, allowDuplicates: true };
      const pairs = [createPair("1", "2")];
      const result = validatePair(allowDupConfig, pairs, "1", "2");
      expect(result).toEqual({ valid: true });
    });

    test("accepts valid new pairs", () => {
      const pairs = [createPair("1", "2")];
      const result = validatePair(config, pairs, "1", "3");
      expect(result).toEqual({ valid: true });
    });
  });

  describe("edge cases", () => {
    test("handles empty recordedPairs", () => {
      const result = validatePair(config, [], "1", "2");
      expect(result).toEqual({ valid: true });
    });

    test("handles multiple existing pairs", () => {
      const pairs = [createPair("1", "2"), createPair("1", "3"), createPair("2", "3")];
      const result = validatePair(config, pairs, "1", "4");
      expect(result).toEqual({ valid: true });
    });
  });
});
