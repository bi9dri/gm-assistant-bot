import { Entity } from "dexie";
import z from "zod";

import type { DB } from "@/db";

export const GuildSchema = z.object({
  id: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
  icon: z.url(),
});

export class Guild extends Entity<DB> {
  readonly id!: string;
  readonly name!: string;
  readonly icon!: string;
}
