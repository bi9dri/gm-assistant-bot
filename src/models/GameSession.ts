import { Entity } from "dexie";
import z from "zod";

import type { DB } from "@/db";

export const GameSessionSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  guildId: z.string().trim().nonempty(),
  reactFlowData: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
});

export class GameSession extends Entity<DB> {
  readonly id!: number;
  name!: string;
  readonly guildId!: string;
  reactFlowData!: string; // JSON encoded string
  readonly createdAt!: Date;
  lastUsedAt!: Date;
}
