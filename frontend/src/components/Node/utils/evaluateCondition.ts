export type RuleNode = {
  type: "rule";
  id: string;
  flagKey: string;
  operator: "equals" | "notEquals" | "contains" | "exists" | "notExists";
  value: string;
  valueType?: "literal" | "flag";
};

export type GroupNode = {
  type: "group";
  id: string;
  logic: "and" | "or";
  children: ConditionNode[];
};

export type ConditionNode = RuleNode | GroupNode;

export type Branch = {
  id: string;
  root: ConditionNode;
};

export type GameFlags = Record<string, string>;

export function evaluateRule(rule: RuleNode, gameFlags: GameFlags): boolean {
  const flagValue = gameFlags[rule.flagKey];
  const flagExists = rule.flagKey in gameFlags;

  const compareValue = rule.valueType === "flag" ? (gameFlags[rule.value] ?? "") : rule.value;

  switch (rule.operator) {
    case "equals":
      return flagExists && flagValue === compareValue;
    case "notEquals":
      return !flagExists || flagValue !== compareValue;
    case "contains":
      return flagExists && flagValue.includes(compareValue);
    case "exists":
      return flagExists;
    case "notExists":
      return !flagExists;
  }
}

export function evaluateConditionNode(node: ConditionNode, gameFlags: GameFlags): boolean {
  if (node.type === "rule") {
    return evaluateRule(node, gameFlags);
  }
  if (node.logic === "and") {
    return node.children.every((child) => evaluateConditionNode(child, gameFlags));
  }
  return node.children.some((child) => evaluateConditionNode(child, gameFlags));
}

export function evaluateConditions(branches: Branch[], gameFlags: GameFlags): string | null {
  for (const branch of branches) {
    if (evaluateConditionNode(branch.root, gameFlags)) {
      return branch.id;
    }
  }
  return null;
}
