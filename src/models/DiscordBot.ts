import { Entity } from "dexie";
import z from "zod";

import type { DB } from "@/db";

export const DiscordBotSchema = z.object({
  id: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
  token: z.string().trim().nonempty(),
  icon: z.url(),
});

export class DiscordBot extends Entity<DB> {
  readonly id!: string;
  readonly name!: string;
  readonly token!: string;
  readonly icon!: string;
}
