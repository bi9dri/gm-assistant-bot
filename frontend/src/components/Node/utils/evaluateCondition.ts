export type Condition = {
  id: string;
  flagKey: string;
  operator: "equals" | "notEquals" | "contains" | "exists" | "notExists";
  value: string;
};

export type GameFlags = Record<string, string>;

export function evaluateCondition(condition: Condition, gameFlags: GameFlags): boolean {
  const flagValue = gameFlags[condition.flagKey];
  const flagExists = condition.flagKey in gameFlags;

  switch (condition.operator) {
    case "equals":
      return flagExists && flagValue === condition.value;
    case "notEquals":
      return !flagExists || flagValue !== condition.value;
    case "contains":
      return flagExists && flagValue.includes(condition.value);
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
