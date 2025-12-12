import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as healthcheck from "./handler/healthcheck";

const app = new Hono().basePath("/api");
const route = app.get("/health", healthcheck.validator, healthcheck.handler);

app.use("*", cors());
app.use("*", logger());

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof route;
