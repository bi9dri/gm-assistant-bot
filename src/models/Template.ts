import { Entity } from "dexie";
import z from "zod";

import { DB } from "@/db";

export const TemplateSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  reactFlowData: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export class Template extends Entity<DB> {
  readonly id!: number;
  name!: string;
  reactFlowData!: string; // JSON encoded string
  readonly createdAt!: Date;
  updatedAt!: Date;
}
