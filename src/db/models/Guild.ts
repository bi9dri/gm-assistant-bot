import { Entity } from "dexie";

import type { DB } from "../database";

export class Guild extends Entity<DB> {
  readonly id!: string;
  readonly name!: string;
  readonly icon?: string;
}
