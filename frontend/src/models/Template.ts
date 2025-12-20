import { Entity } from "dexie";
import z from "zod";

import { DB } from "@/db";

import { TemplateChannelSchema } from "./TemplateChannel";
import { TemplateNodeSchema } from "./TemplateNode";

export const TemplateSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  roles: z.array(z.string().trim().nonempty()),
  channels: z.array(TemplateChannelSchema),
  nodes: z.record(z.number(), TemplateNodeSchema),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const TemplateInsertSchema = TemplateSchema.omit({ id: true, channels: true, nodes: true });

export class Template extends Entity<DB> {
  readonly id!: number;
  name!: string;
  roles!: string[];
  readonly createdAt!: Date;
  readonly updatedAt?: Date;

  get channels() {
    return this.db.TemplateChannel.where("templateId").equals(this.id).toArray();
  }

  get nodes() {
    return this.db.TemplateNode.where("templateId").equals(this.id).toArray();
  }

  private ChannelSchema = TemplateChannelSchema.superRefine((data, ctx) => {
    data.writerRoles.forEach((role, roleIndex) => {
      if (!this.roles.includes(role)) {
        ctx.addIssue({
          code: "custom",
          message: `Role "${role}" in writerRoles is not defined in template roles array`,
          path: ["writerRoles", roleIndex],
        });
      }
    });
    data.readerRoles.forEach((role, roleIndex) => {
      if (!this.roles.includes(role)) {
        ctx.addIssue({
          code: "custom",
          message: `Role "${role}" in readerRoles is not defined in template roles array`,
          path: ["readerRoles", roleIndex],
        });
      }
    });
  });
  private ChannelCreateSchema = this.ChannelSchema.omit({ id: true, templateId: true });
  private ChannelUpdateSchema = this.ChannelCreateSchema.partial();

  private CreateNodeSchema = TemplateNodeSchema.omit({ id: true, templateId: true });

  async addChannel(data: z.infer<typeof this.ChannelCreateSchema>) {
    const parsed = this.ChannelCreateSchema.parse(data);
    return this.db.TemplateChannel.add({
      ...parsed,
      templateId: this.id,
    });
  }

  async updateChannel(id: number, data: z.infer<typeof this.ChannelUpdateSchema>) {
    const parsed = this.ChannelUpdateSchema.parse(data);
    return this.db.TemplateChannel.update(id, parsed);
  }

  async addNode(data: z.infer<typeof this.CreateNodeSchema>) {
    const parsed = this.CreateNodeSchema.parse(data);
    return this.db.TemplateNode.add({
      ...parsed,
      templateId: this.id,
    });
  }
}
