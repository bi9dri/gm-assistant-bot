import { db } from "@/db";
import z from "zod";

const schema = z.object({
  id: z.number(),
  name: z.string().min(1).trim(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export class Template {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt?: Date;

  constructor(id: number, name: string, createdAt: Date, updatedAt?: Date) {
    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static async create(name: string) {
    schema.pick({ name: true }).parse({ name });
    const now = new Date();
    const id = await db.templates.add({
      name,
      createdAt: now,
    });
    return new Template(id, name, now);
  }

  async update() {
    schema.parse(this);
    const u = this.updatedAt;
    try {
      this.updatedAt = new Date();
      await db.templates.update(this.id, this);
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
