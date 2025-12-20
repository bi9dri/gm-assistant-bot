import { hc } from "hono/client";

import type { AppType } from "../../backend";

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8787"
    : "https://your-production-domain.com";

const client = hc<AppType>(API_BASE_URL);
export default client.api;
