import z from "zod";
import { createCategory } from "../discord";
import { defineJsonHandler } from "./utils";

const schema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const { validator, handler } = defineJsonHandler(schema, async (data, c) => {
  const category = await createCategory(data.guildId, data.name);
  return c.json({
    category: { ...category },
  });
});
