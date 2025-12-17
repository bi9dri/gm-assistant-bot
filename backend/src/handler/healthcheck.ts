import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";

// sample validation, can be removed
export const validator = zValidator("query", z.object({}));

export const handler = (c: Context) => {
  return c.json({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  });
};
