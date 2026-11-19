const toFlagString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

export const coerceFlags = (flags: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(flags).map(([key, value]) => [key, toFlagString(value)]));
