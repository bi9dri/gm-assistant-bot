import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createCategory, createChannel, createRole, deleteChannel, deleteRole, getGuilds } from "./discord";
import { zValidator } from "@hono/zod-validator";
import { createRoleSchema, createCategorySchema, createChannelSchema, deleteRoleSchema, deleteChannelSchema } from "./schemas";

const app = new Hono()
  .basePath("/api")
  .use("*", cors())
  .use("*", logger())
  .get("/health", (c) => c.json({ status: "ok" as const }))
  .get("/guilds", async (c) => {
    return c.json({ guilds: await getGuilds() });
  })
  .post("/roles", zValidator("json", createRoleSchema), async (c) => {
    const role = await createRole(c.req.valid("json"));
    return c.json({ role });
  })
  .delete("/roles", zValidator("json", deleteRoleSchema), async (c) => {
    await deleteRole(c.req.valid("json"));
    return new Response(undefined, { status: 201 });
  })
  .post("/categories", zValidator("json", createCategorySchema), async (c) => {
    const category = await createCategory(c.req.valid("json"));
    return c.json({ category });
  })
  .post("/channels", zValidator("json", createChannelSchema), async (c) => {
    const channel = await createChannel(c.req.valid("json"));
    return c.json({ channel });
  })
  .delete("/channels", zValidator("json", deleteChannelSchema), async (c) => {
    await deleteChannel(c.req.valid("json"));
    return new Response(undefined, { status: 204 });
  })
  .notFound((c) => c.json({ error: "Not Found" }, 404))
  .onError((err, c) => {
    console.error("Server error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  });

export default app;
export type AppType = typeof app;
