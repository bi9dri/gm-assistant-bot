import { describe, expect, it } from "bun:test";

import type { RuleNode, ConditionNode, Branch } from "./evaluateCondition";

import { evaluateRule, evaluateConditionNode, evaluateConditions } from "./evaluateCondition";

describe("evaluateRule", () => {
  const gameFlags = {
    team: "A",
    role: "detective",
    playerCount: "4",
    hasItem: "true",
  };

  describe("equals operator", () => {
    it("returns true when flag value matches", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "A",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(true);
    });

    it("returns false when flag value does not match", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "B",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(false);
    });

    it("returns false when flag does not exist", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "nonExistent",
        operator: "equals",
        value: "A",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(false);
    });
  });

  describe("notEquals operator", () => {
    it("returns true when flag value does not match", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "notEquals",
        value: "B",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(true);
    });

    it("returns false when flag value matches", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "notEquals",
        value: "A",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(false);
    });

    it("returns true when flag does not exist", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "nonExistent",
        operator: "notEquals",
        value: "A",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(true);
    });
  });

  describe("contains operator", () => {
    it("returns true when flag value contains substring", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "role",
        operator: "contains",
        value: "tect",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(true);
    });

    it("returns false when flag value does not contain substring", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "role",
        operator: "contains",
        value: "admin",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(false);
    });

    it("returns false when flag does not exist", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "nonExistent",
        operator: "contains",
        value: "test",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(false);
    });
  });

  describe("exists operator", () => {
    it("returns true when flag exists", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "exists",
        value: "",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(true);
    });

    it("returns false when flag does not exist", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "nonExistent",
        operator: "exists",
        value: "",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(false);
    });
  });

  describe("notExists operator", () => {
    it("returns true when flag does not exist", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "nonExistent",
        operator: "notExists",
        value: "",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(true);
    });

    it("returns false when flag exists", () => {
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "notExists",
        value: "",
      };
      expect(evaluateRule(rule, gameFlags)).toBe(false);
    });
  });

  describe("valueType: flag", () => {
    it("equals: returns true when two flags have the same value", () => {
      const flags = { team: "A", alias: "A" };
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateRule(rule, flags)).toBe(true);
    });

    it("equals: returns false when two flags have different values", () => {
      const flags = { team: "A", alias: "B" };
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateRule(rule, flags)).toBe(false);
    });

    it("notEquals: returns true when two flags have different values", () => {
      const flags = { team: "A", alias: "B" };
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "notEquals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateRule(rule, flags)).toBe(true);
    });

    it("notEquals: returns false when two flags have the same value", () => {
      const flags = { team: "A", alias: "A" };
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "notEquals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateRule(rule, flags)).toBe(false);
    });

    it("contains: returns true when flag value contains the referenced flag's value", () => {
      const flags = { role: "detective", sub: "tect" };
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "role",
        operator: "contains",
        value: "sub",
        valueType: "flag",
      };
      expect(evaluateRule(rule, flags)).toBe(true);
    });

    it("contains: returns false when flag value does not contain the referenced flag's value", () => {
      const flags = { role: "detective", sub: "admin" };
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "role",
        operator: "contains",
        value: "sub",
        valueType: "flag",
      };
      expect(evaluateRule(rule, flags)).toBe(false);
    });

    it("equals: treats missing referenced flag as empty string", () => {
      const flags = { team: "" };
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "team",
        operator: "equals",
        value: "nonExistentFlag",
        valueType: "flag",
      };
      // team is "" and nonExistentFlag resolves to "", so they are equal
      expect(evaluateRule(rule, flags)).toBe(true);
    });

    it("equals: returns false when flag does not exist even with flag valueType", () => {
      const flags = { alias: "A" };
      const rule: RuleNode = {
        type: "rule",
        id: "1",
        flagKey: "nonExistent",
        operator: "equals",
        value: "alias",
        valueType: "flag",
      };
      expect(evaluateRule(rule, flags)).toBe(false);
    });
  });
});

describe("evaluateConditionNode", () => {
  const gameFlags = {
    team: "A",
    role: "detective",
    status: "active",
  };

  const ruleA: ConditionNode = {
    type: "rule",
    id: "A",
    flagKey: "team",
    operator: "equals",
    value: "A",
  };
  const ruleB: ConditionNode = {
    type: "rule",
    id: "B",
    flagKey: "role",
    operator: "equals",
    value: "detective",
  };
  const ruleC: ConditionNode = {
    type: "rule",
    id: "C",
    flagKey: "status",
    operator: "equals",
    value: "active",
  };
  const ruleFalse: ConditionNode = {
    type: "rule",
    id: "X",
    flagKey: "team",
    operator: "equals",
    value: "Z",
  };

  describe("RuleNode", () => {
    it("delegates to evaluateRule", () => {
      expect(evaluateConditionNode(ruleA, gameFlags)).toBe(true);
      expect(evaluateConditionNode(ruleFalse, gameFlags)).toBe(false);
    });
  });

  describe("GroupNode AND", () => {
    it("returns true when all children are true", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "and",
        children: [ruleA, ruleB, ruleC],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(true);
    });

    it("returns false when any child is false", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "and",
        children: [ruleA, ruleFalse, ruleC],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(false);
    });

    it("returns true for empty children (vacuous truth)", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "and",
        children: [],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(true);
    });
  });

  describe("GroupNode OR", () => {
    it("returns true when any child is true", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "or",
        children: [ruleFalse, ruleB],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(true);
    });

    it("returns false when all children are false", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "or",
        children: [ruleFalse, ruleFalse],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(false);
    });

    it("returns false for empty children", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "or",
        children: [],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(false);
    });
  });

  describe("nested conditions", () => {
    it("A AND (B OR C) - all true", () => {
      // team=A AND (role=detective OR status=active) → true
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "and",
        children: [ruleA, { type: "group", id: "g2", logic: "or", children: [ruleB, ruleC] }],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(true);
    });

    it("A AND (B OR C) - outer false", () => {
      // team=Z AND (role=detective OR status=active) → false
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "and",
        children: [ruleFalse, { type: "group", id: "g2", logic: "or", children: [ruleB, ruleC] }],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(false);
    });

    it("(A AND B) OR (C AND false) - first group true", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "or",
        children: [
          { type: "group", id: "g2", logic: "and", children: [ruleA, ruleB] },
          { type: "group", id: "g3", logic: "and", children: [ruleC, ruleFalse] },
        ],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(true);
    });

    it("(A AND false) OR (false AND C) - all false", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "or",
        children: [
          { type: "group", id: "g2", logic: "and", children: [ruleA, ruleFalse] },
          { type: "group", id: "g3", logic: "and", children: [ruleFalse, ruleC] },
        ],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(false);
    });

    it("A AND (B OR (C AND false)) - inner OR false, outer AND false", () => {
      // team=A AND (role=detective OR (status=active AND team=Z))
      // = true AND (true OR false) = true AND true = true
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "and",
        children: [
          ruleA,
          {
            type: "group",
            id: "g2",
            logic: "or",
            children: [
              ruleB,
              { type: "group", id: "g3", logic: "and", children: [ruleC, ruleFalse] },
            ],
          },
        ],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(true);
    });

    it("false AND (B OR (C AND false)) - outer AND false because first child false", () => {
      const node: ConditionNode = {
        type: "group",
        id: "g1",
        logic: "and",
        children: [
          ruleFalse,
          {
            type: "group",
            id: "g2",
            logic: "or",
            children: [
              ruleB,
              { type: "group", id: "g3", logic: "and", children: [ruleC, ruleFalse] },
            ],
          },
        ],
      };
      expect(evaluateConditionNode(node, gameFlags)).toBe(false);
    });
  });
});

describe("evaluateConditions", () => {
  const gameFlags = {
    team: "A",
    role: "detective",
  };

  it("returns the first matching branch id", () => {
    const branches: Branch[] = [
      {
        id: "1",
        root: { type: "rule", id: "r1", flagKey: "team", operator: "equals", value: "B" },
      },
      {
        id: "2",
        root: { type: "rule", id: "r2", flagKey: "role", operator: "equals", value: "detective" },
      },
      {
        id: "3",
        root: { type: "rule", id: "r3", flagKey: "team", operator: "equals", value: "A" },
      },
    ];
    expect(evaluateConditions(branches, gameFlags)).toBe("2");
  });

  it("returns null when no branches match", () => {
    const branches: Branch[] = [
      {
        id: "1",
        root: { type: "rule", id: "r1", flagKey: "team", operator: "equals", value: "B" },
      },
      {
        id: "2",
        root: { type: "rule", id: "r2", flagKey: "role", operator: "equals", value: "admin" },
      },
    ];
    expect(evaluateConditions(branches, gameFlags)).toBeNull();
  });

  it("returns null for empty branches array", () => {
    expect(evaluateConditions([], gameFlags)).toBeNull();
  });

  it("evaluates branches in order", () => {
    const branches: Branch[] = [
      {
        id: "first",
        root: { type: "rule", id: "r1", flagKey: "team", operator: "equals", value: "A" },
      },
      {
        id: "second",
        root: { type: "rule", id: "r2", flagKey: "team", operator: "equals", value: "A" },
      },
    ];
    expect(evaluateConditions(branches, gameFlags)).toBe("first");
  });

  it("evaluates complex condition tree in a branch", () => {
    const branches: Branch[] = [
      {
        id: "complex",
        root: {
          type: "group",
          id: "g1",
          logic: "and",
          children: [
            { type: "rule", id: "r1", flagKey: "team", operator: "equals", value: "A" },
            {
              type: "group",
              id: "g2",
              logic: "or",
              children: [
                { type: "rule", id: "r2", flagKey: "role", operator: "equals", value: "detective" },
                { type: "rule", id: "r3", flagKey: "role", operator: "equals", value: "admin" },
              ],
            },
          ],
        },
      },
    ];
    expect(evaluateConditions(branches, gameFlags)).toBe("complex");
  });
});
