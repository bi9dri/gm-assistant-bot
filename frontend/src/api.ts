import { hc } from "hono/client";

import type { AppType } from "../../backend/src/index";

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8787"
    : "https://gm-assistant-bot-api.workers.dev";

export const BOT_TOKEN_HEADER = "X-Discord-Bot-Token";

const client = hc<AppType>(API_BASE_URL);

export default client.api;
