// ライブなゲームフラグは string 値で扱う (evaluateCondition / DynamicValue が string 前提)。
// GameSession.gameFlags は any 値を持ちうるため、実行モードの store へ載せる前に寄せる。
const toFlagString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

export const coerceFlags = (flags: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(flags).map(([key, value]) => [key, toFlagString(value)]));
