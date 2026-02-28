import { describe, expect, it } from "bun:test";

import type { Condition } from "./evaluateCondition";

import { evaluateCondition, evaluateConditions } from "./evaluateCondition";

describe("evaluateCondition", () => {
  const gameFlags = {
    team: "A",
    role: "detective",
    playerCount: "4",
    hasItem: "true",
  };

  describe("equals operator", () => {
    it("returns true when flag value matches", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "A",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(true);
    });

    it("returns false when flag value does not match", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "B",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(false);
    });

    it("returns false when flag does not exist", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "nonExistent",
        operator: "equals",
        value: "A",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(false);
    });
  });

  describe("notEquals operator", () => {
    it("returns true when flag value does not match", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "notEquals",
        value: "B",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(true);
    });

    it("returns false when flag value matches", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "notEquals",
        value: "A",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(false);
    });

    it("returns true when flag does not exist", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "nonExistent",
        operator: "notEquals",
        value: "A",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(true);
    });
  });

  describe("contains operator", () => {
    it("returns true when flag value contains substring", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "role",
        operator: "contains",
        value: "tect",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(true);
    });

    it("returns false when flag value does not contain substring", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "role",
        operator: "contains",
        value: "admin",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(false);
    });

    it("returns false when flag does not exist", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "nonExistent",
        operator: "contains",
        value: "test",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(false);
    });
  });

  describe("exists operator", () => {
    it("returns true when flag exists", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "exists",
        value: "",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(true);
    });

    it("returns false when flag does not exist", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "nonExistent",
        operator: "exists",
        value: "",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(false);
    });
  });

  describe("notExists operator", () => {
    it("returns true when flag does not exist", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "nonExistent",
        operator: "notExists",
        value: "",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(true);
    });

    it("returns false when flag exists", () => {
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "notExists",
        value: "",
      };
      expect(evaluateCondition(condition, gameFlags)).toBe(false);
    });
  });

  describe("valueType: flag", () => {
    it("equals: returns true when two flags have the same value", () => {
      const flags = { team: "A", alias: "A" };
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateCondition(condition, flags)).toBe(true);
    });

    it("equals: returns false when two flags have different values", () => {
      const flags = { team: "A", alias: "B" };
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateCondition(condition, flags)).toBe(false);
    });

    it("notEquals: returns true when two flags have different values", () => {
      const flags = { team: "A", alias: "B" };
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "notEquals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateCondition(condition, flags)).toBe(true);
    });

    it("notEquals: returns false when two flags have the same value", () => {
      const flags = { team: "A", alias: "A" };
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "notEquals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateCondition(condition, flags)).toBe(false);
    });

    it("contains: returns true when flag value contains the referenced flag's value", () => {
      const flags = { role: "detective", sub: "tect" };
      const condition: Condition = {
        id: "1",
        flagKey: "role",
        operator: "contains",
        value: "sub",
        valueType: "flag",
      };
      expect(evaluateCondition(condition, flags)).toBe(true);
    });

    it("contains: returns false when flag value does not contain the referenced flag's value", () => {
      const flags = { role: "detective", sub: "admin" };
      const condition: Condition = {
        id: "1",
        flagKey: "role",
        operator: "contains",
        value: "sub",
        valueType: "flag",
      };
      expect(evaluateCondition(condition, flags)).toBe(false);
    });

    it("equals: treats missing referenced flag as empty string", () => {
      const flags = { team: "" };
      const condition: Condition = {
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "nonExistentFlag",
        valueType: "flag",
      };
      // team is "" and nonExistentFlag resolves to "", so they are equal
      expect(evaluateCondition(condition, flags)).toBe(true);
    });

    it("equals: returns false when flag does not exist even with flag valueType", () => {
      const flags = { alias: "A" };
      const condition: Condition = {
        id: "1",
        flagKey: "nonExistent",
        operator: "equals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateCondition(condition, flags)).toBe(false);
    });
  });
});

describe("evaluateConditions", () => {
  const gameFlags = {
    team: "A",
    role: "detective",
  };

  it("returns the first matching condition", () => {
    const conditions: Condition[] = [
      { id: "1", flagKey: "team", operator: "equals", value: "B" },
      { id: "2", flagKey: "role", operator: "equals", value: "detective" },
      { id: "3", flagKey: "team", operator: "equals", value: "A" },
    ];
    expect(evaluateConditions(conditions, gameFlags)).toBe("2");
  });

  it("returns null when no conditions match", () => {
    const conditions: Condition[] = [
      { id: "1", flagKey: "team", operator: "equals", value: "B" },
      { id: "2", flagKey: "role", operator: "equals", value: "admin" },
    ];
    expect(evaluateConditions(conditions, gameFlags)).toBeNull();
  });

  it("returns null for empty conditions array", () => {
    expect(evaluateConditions([], gameFlags)).toBeNull();
  });

  it("evaluates conditions in order", () => {
    const conditions: Condition[] = [
      { id: "first", flagKey: "team", operator: "equals", value: "A" },
      { id: "second", flagKey: "team", operator: "equals", value: "A" },
    ];
    expect(evaluateConditions(conditions, gameFlags)).toBe("first");
  });
});
