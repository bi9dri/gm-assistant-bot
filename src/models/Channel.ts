import { Entity } from "dexie";
import z from "zod";

import type { DB } from "@/db";

export const ChannelSchema = z.object({
  id: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string().trim().nonempty()),
  readerRoleIds: z.array(z.string().trim().nonempty()),
});

export class Channel extends Entity<DB> {
  readonly id!: string;
  readonly name!: string;
  readonly type!: "text" | "voice";
  readonly writerRoleIds!: string[];
  readonly readerRoleIds!: string[];
}
