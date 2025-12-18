import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";
import { createRole } from "../discord";
import type { JsonInput } from "./utils";

const schema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const validator = zValidator("json", schema);

export const handler = async (c: Context<{}, string, JsonInput<typeof schema>>) => {
  const data = c.req.valid("json");
  const role = await createRole(data.guildId, data.name);
  return c.json({
    role: {
      id: role.id,
      name: role.name,
    },
  });
};
