import { Entity } from "dexie";
import z from "zod";

import { DB } from "@/db";

import { TemplateNodeSchema } from "./TemplateNode";

export const TemplateSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  nodes: z.record(z.number(), TemplateNodeSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export class Template extends Entity<DB> {
  readonly id!: number;
  name!: string;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  get nodes() {
    return this.db.TemplateNode.where("templateId").equals(this.id).toArray();
  }

  private CreateNodeSchema = TemplateNodeSchema.omit({ id: true, templateId: true });

  async addNode(data: z.infer<typeof this.CreateNodeSchema>) {
    const parsed = this.CreateNodeSchema.parse(data);
    return this.db.TemplateNode.add({
      ...parsed,
      templateId: this.id,
    });
  }
}
