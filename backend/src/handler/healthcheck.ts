import { zValidator } from "@hono/zod-validator";
import type { H } from "hono/types";
import z from "zod";

export const validator = zValidator("query", z.object({}));

export const handler: H = (c) => {
  return c.json({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  });
};
