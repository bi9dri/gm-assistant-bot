import { Entity } from "dexie";
import z from "zod";

import { DB } from "@/db";

export const TemplateChannelSchema = z.object({
  id: z.int(),
  templateId: z.int(),
  name: z.string().trim().nonempty(),
  type: z.enum(["text", "voice"]),
  writerRoles: z.array(z.string().trim().nonempty()),
  readerRoles: z.array(z.string().trim().nonempty()),
});

const UpdateSchema = TemplateChannelSchema.omit({ id: true, templateId: true }).partial();

export class TemplateChannel extends Entity<DB> {
  readonly id!: number;
  readonly templateId!: number;
  name!: string;
  readonly type!: "text" | "voice";
  writerRoles!: string[];
  readerRoles!: string[];

  async update(data: z.infer<typeof UpdateSchema>) {
    const template = await this.db.Template.get(this.templateId);
    if (!template) {
      throw new Error("Template not found");
    }
    return template.updateChannel(this.id, data);
  }

  async save() {
    return this.update(this);
  }
}
