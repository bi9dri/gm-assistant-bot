import { Entity } from "dexie";
import z from "zod";

import { DB } from "@/db";

export const TemplateNodeSchema = z.object({
  id: z.int(),
  templateId: z.int(),
  description: z.string().trim(),
});

export class TemplateNode extends Entity<DB> {
  readonly id!: number;
  readonly templateId!: number;
  description!: string;

  possibleDestinationNodes() {
    return [0];
  }
}
