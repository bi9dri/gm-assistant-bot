import { Entity } from "dexie";

import type { DB } from "../database";

export class Role extends Entity<DB> {
  readonly id!: string;
  readonly guildId!: string;
  readonly name!: string;
}
