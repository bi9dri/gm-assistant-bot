import { Entity } from "dexie";
import z from "zod";

import type { DB } from "@/db";

export const GameSessionSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  guildId: z.string().trim().nonempty(),
  createdAt: z.date(),
});

export class GameSession extends Entity<DB> {
  readonly id!: number;
  name!: string;
  readonly guildId!: string;
  readonly createdAt!: Date;
}
