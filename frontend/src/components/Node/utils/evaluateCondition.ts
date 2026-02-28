export type Condition = {
  id: string;
  flagKey: string;
  operator: "equals" | "notEquals" | "contains" | "exists" | "notExists";
  value: string;
  valueType?: "literal" | "flag";
};

export type GameFlags = Record<string, string>;

export function evaluateCondition(condition: Condition, gameFlags: GameFlags): boolean {
  const flagValue = gameFlags[condition.flagKey];
  const flagExists = condition.flagKey in gameFlags;

  const compareValue =
    condition.valueType === "flag" ? (gameFlags[condition.value] ?? "") : condition.value;

  switch (condition.operator) {
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

export function evaluateConditions(conditions: Condition[], gameFlags: GameFlags): string | null {
  for (const condition of conditions) {
    if (evaluateCondition(condition, gameFlags)) {
      return condition.id;
    }
  }
  return null;
}
