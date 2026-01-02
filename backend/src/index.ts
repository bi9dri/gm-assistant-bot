import { DiscordAPIError, RateLimitError } from "@discordjs/rest";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import {
  addRoleToRoleMembers,
  changeChannelPermissions,
  createCategory,
  createChannel,
  createRole,
  deleteChannel,
  deleteRole,
  getGuilds,
  getProfile,
} from "./discord";
import {
  addRoleToRoleMembersSchema,
  BOT_TOKEN_HEADER,
  changeChannelPermissionsSchema,
  createCategorySchema,
  createChannelSchema,
  createRoleSchema,
  deleteChannelSchema,
  deleteRoleSchema,
} from "./schemas";

type Variables = {
  botToken: string;
};

const app = new Hono<{ Variables: Variables }>()
  .basePath("/api")
  .use(
    "*",
    cors({
      origin: ["http://localhost:3000", "https://gm-assistant-bot.pages.dev"],
      allowHeaders: ["Content-Type", BOT_TOKEN_HEADER],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .use("*", logger())

  // Health check (no auth required)
  .get("/health", (c) => c.json({ status: "ok" as const }))

  // Bot token middleware for authenticated endpoints
  .use("/*", async (c, next) => {
    const token = c.req.header(BOT_TOKEN_HEADER);
    if (!token) {
      return c.json({ error: "Bot token is required" }, 401);
    }
    c.set("botToken", token);
    await next();
  })

  .get("/profile", async (c) => {
    const profile = await getProfile(c.get("botToken"));
    return c.json({ profile });
  })

  .get("/guilds", async (c) => {
    const guilds = await getGuilds(c.get("botToken"));
    return c.json({ guilds });
  })

  .post("/roles", zValidator("json", createRoleSchema), async (c) => {
    const role = await createRole(c.get("botToken"), c.req.valid("json"));
    return c.json({ role });
  })
  .delete("/roles", zValidator("json", deleteRoleSchema), async (c) => {
    await deleteRole(c.get("botToken"), c.req.valid("json"));
    return c.body(null, 204);
  })
  .post("/roles/addRoleToRoleMembers", zValidator("json", addRoleToRoleMembersSchema), async (c) => {
    await addRoleToRoleMembers(c.get("botToken"), c.req.valid("json"));
    return c.body(null, 204);
  })

  .post("/categories", zValidator("json", createCategorySchema), async (c) => {
    const category = await createCategory(c.get("botToken"), c.req.valid("json"));
    return c.json({ category });
  })

  .post("/channels", zValidator("json", createChannelSchema), async (c) => {
    const channel = await createChannel(c.get("botToken"), c.req.valid("json"));
    return c.json({ channel });
  })
  .delete("/channels", zValidator("json", deleteChannelSchema), async (c) => {
    await deleteChannel(c.get("botToken"), c.req.valid("json"));
    return c.body(null, 204);
  })
  .patch("/channels/permissions", zValidator("json", changeChannelPermissionsSchema), async (c) => {
    await changeChannelPermissions(c.get("botToken"), c.req.valid("json"));
    return c.body(null, 204);
  })

  .notFound((c) => c.json({ error: "Not Found" }, 404))
  .onError((err, c) => {
    console.error("Server error:", err);

    if (err instanceof DiscordAPIError) {
      const status = err.status as 400 | 401 | 403 | 404 | 500;
      return c.json({ error: err.message, code: err.code }, status);
    }

    if (err instanceof RateLimitError) {
      return c.json({ error: "Rate limited", retryAfter: err.retryAfter }, 429);
    }

    return c.json({ error: err.message || "Internal Server Error" }, 500);
  });

export default app;
export type AppType = typeof app;
