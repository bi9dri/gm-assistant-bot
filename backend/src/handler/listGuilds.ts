import type { Context } from "hono";
import { getGuilds } from "../discord";

export const handler = async (c: Context) => {
  return c.json({
    guilds: await getGuilds(),
  });
};
