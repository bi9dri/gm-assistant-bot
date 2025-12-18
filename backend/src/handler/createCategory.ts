import z from "zod";
import { createCategory } from "../discord";
import { createJsonHandler } from "./utils";

const schema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const { validator, handler } = createJsonHandler(schema, async (data, c) => {
  const category = await createCategory(data.guildId, data.name);
  return c.json({
    category: { ...category },
  });
});
