import { Entity } from "dexie";
import z from "zod";

import { DB } from "@/db";

export const RoleSchema = z.object({
  id: z.string().trim().nonempty(),
  guildId: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
});

export class Role extends Entity<DB> {
  readonly id!: string;
  readonly guildId!: string;
  readonly name!: string;
}
