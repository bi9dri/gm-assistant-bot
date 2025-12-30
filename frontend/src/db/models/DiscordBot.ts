import { Entity } from "dexie";

import type { DB } from "../database";

export class DiscordBot extends Entity<DB> {
  readonly id!: string;
  readonly name!: string;
  readonly token!: string;
  readonly icon!: string;
}
