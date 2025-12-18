import type { Context } from "hono";
import z from "zod";
import { createCategory } from "../discord";
import { type JsonInput, createJsonValidator, getJsonData } from "./utils";

const schema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const validator = createJsonValidator(schema);

export const handler = async (c: Context<any, any, JsonInput<typeof schema>>) => {
  const data = await getJsonData(c);
  const category = await createCategory(data.guildId, data.name);
  return c.json({
    category: { ...category },
  });
};
