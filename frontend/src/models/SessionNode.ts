import { Entity } from "dexie";
import z from "zod";

import { DB } from "@/db";

export const SessionNodeSchema = z.object({
  id: z.int(),
  sessionId: z.int(),
  description: z.string().trim().nonempty(),
  executedAt: z.date().optional(),
});

export class SessionNode extends Entity<DB> {
  readonly id!: number;
  readonly sessionId!: number;
  readonly description!: string;
  readonly executedAt?: Date;
}
