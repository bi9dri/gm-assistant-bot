import type { Context } from "hono";
import { getGuilds } from "../discord";

export const handler = async (c: Context) => {
  try {
    const guilds = await getGuilds();
    return c.json({
      guilds,
    });
  } catch (error) {
    return c.json(
      {
        error: "Failed to fetch guilds",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
};
