import type { AppType } from "../../../backend";
import { hc } from "hono/client";

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gm-assistant-bot-backend.workers.dev";

const client = hc<AppType>(API_BASE_URL);
export default client.api;
