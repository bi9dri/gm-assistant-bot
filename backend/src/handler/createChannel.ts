import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";
import { createChannel } from "../discord";

const schema = z.object({
  guildId: z.string().min(1),
  parentCategoryId: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string()),
  readerRoleIds: z.array(z.string()),
});

export const validator = zValidator("json", schema);

export const handler = async (
  c: Context<{}, string, { in: { json: z.infer<typeof schema> }; out: { json: z.infer<typeof schema> } }>,
) => {
  const data = c.req.valid("json");
  const channel = await createChannel(
    data.guildId,
    data.parentCategoryId,
    data.name,
    data.type,
    data.writerRoleIds,
    data.readerRoleIds,
  );
  return c.json({
    channel: {
      id: channel.id,
      name: channel.name,
      type: data.type,
    },
  });
};
