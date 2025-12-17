import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as healthcheck from "./handler/healthcheck";
import * as listGuilds from "./handler/listGuilds";
import * as createCategory from "./handler/createCategory";
import * as createRole from "./handler/createRole";
import * as createChannel from "./handler/createChannel";

const app = new Hono().basePath("/api");

app.use("*", cors());
app.use("*", logger());

const route = app
  .get("/health", healthcheck.handler)
  .get("/guilds", listGuilds.handler)
  .post("/categories", createCategory.validator, createCategory.handler)
  .post("/roles", createRole.validator, createRole.handler)
  .post("/channels", createChannel.validator, createChannel.handler)
  .notFound((c) => c.json({ error: "Not Found" }, 404))
  .onError((err, c) => {
    console.error("Server error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  });

export default app;
export type AppType = typeof route;
