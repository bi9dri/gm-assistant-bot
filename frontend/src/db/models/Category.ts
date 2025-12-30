import { Entity } from "dexie";

import type { DB } from "../database";

export class Category extends Entity<DB> {
  readonly id!: string;
  readonly sessionId!: number;
  readonly name!: string;
}
