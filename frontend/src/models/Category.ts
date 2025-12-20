import { Entity } from "dexie";
import z from "zod";

import type { DB } from "@/db";

export const CategorySchema = z.object({
  id: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
});

export class Category extends Entity<DB> {
  readonly id!: string;
  readonly name!: string;
}
