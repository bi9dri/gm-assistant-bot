import { oc } from "@orpc/contract";
import { os } from "@orpc/server";
import { z } from "zod";

// Define contract
export const contract = {
  health: oc
    .input(z.void())
    .output(
      z.object({
        status: z.literal("ok"),
        timestamp: z.string(),
      })
    )
    .route({ method: "GET", path: "/health" }),
};

// Implement router
export const router = os
  .router({
    health: os.handler(() => ({
      status: "ok" as const,
      timestamp: new Date().toISOString(),
    })),
  });
