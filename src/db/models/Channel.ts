import { Entity } from "dexie";

import type { DB } from "../database";

export class Channel extends Entity<DB> {
  readonly id!: string;
  readonly sessionId!: number;
  readonly name!: string;
  readonly type!: "text" | "voice";
  readonly writerRoleIds!: string[];
  readonly readerRoleIds!: string[];
}
