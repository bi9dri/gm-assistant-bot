import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HealthResponseSchema } from "./types/api";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/api/health", (c) => {
  const response = {
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  };
  HealthResponseSchema.parse(response);
  return c.json(response);
});

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
