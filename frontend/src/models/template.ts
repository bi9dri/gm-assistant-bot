import { db } from "@/db";
import z from "zod";

const schema = z.object({
  id: z.number(),
  name: z.string().min(1).trim(),
  roles: z.array(z.string().min(1).trim()),
  channels: z.array(
    z.object({
      name: z.string().min(1).max(50).trim(),
      type: z.enum(["text", "voice"]),
      writerRoles: z.array(z.string().min(1).trim()),
      readerRoles: z.array(z.string().min(1).trim()),
    }),
  ),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export class Template {
  id: number;
  name: string;
  roles: string[];
  channels: {
    name: string;
    type: "text" | "voice";
    writerRoles: string[];
    readerRoles: string[];
  }[];
  createdAt: Date;
  updatedAt?: Date;

  constructor(
    id: number,
    name: string,
    roles: string[],
    channels: {
      name: string;
      type: "text" | "voice";
      writerRoles: string[];
      readerRoles: string[];
    }[],
    createdAt: Date,
    updatedAt?: Date,
  ) {
    this.id = id;
    this.name = name;
    this.roles = roles;
    this.channels = channels;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static async create(
    name: string,
    roles: string[],
    channels: {
      name: string;
      type: "text" | "voice";
      writerRoles: string[];
      readerRoles: string[];
    }[],
  ) {
    schema.pick({ name: true }).parse({ name });
    const now = new Date();
    const id = await db.templates.add({
      name,
      roles,
      channels,
      createdAt: now,
    });
    return new Template(id, name, roles, channels, now);
  }

  async update() {
    schema.parse(this);
    const u = this.updatedAt;
    try {
      this.updatedAt = new Date();
      await db.templates.put(this, this.id);
    } catch (e) {
      this.updatedAt = u;
      throw e;
    }
  }

  static async delete(id: number) {
    await db.templates.delete(id);
  }

  static async getAll() {
    return db.templates.toArray();
  }

  static async getById(id: number) {
    return db.templates.get(id);
  }
}
