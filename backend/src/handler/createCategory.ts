import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";
import { createCategory } from "../discord";

const schema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const validator = zValidator("json", schema);

export const handler = async (
  c: Context<{}, string, { in: { json: z.infer<typeof schema> }; out: { json: z.infer<typeof schema> } }>,
) => {
  const data = c.req.valid("json");
  const category = await createCategory(data.guildId, data.name);
  return c.json({
    category: { ...category },
  });
};
