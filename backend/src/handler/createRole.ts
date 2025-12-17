import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";
import { createRole } from "../discord";

const schema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const validator = zValidator("json", schema);

type input = {
  in: {
    json: z.infer<typeof schema>;
  };
};

export const handler = async (c: Context<any, any, input>) => {
  const data = await c.req.json<input["in"]["json"]>();
  const role = await createRole(data.guildId, data.name);
  return c.json({
    role: {
      id: role.id,
      name: role.name,
    },
  });
};
