import type { Context } from "hono";

export const handler = (c: Context) => {
  return c.json({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  });
};
