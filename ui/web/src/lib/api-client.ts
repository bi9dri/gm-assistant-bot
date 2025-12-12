import { HealthResponseSchema, type HealthResponse } from "../../../backend/src/types/api";

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gm-assistant-bot-backend.workers.dev";

export const api = {
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return HealthResponseSchema.parse(data);
  },
} as const;
