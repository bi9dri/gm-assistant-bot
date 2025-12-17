import { db } from "@/db";
import z from "zod";

const schema = z.object({
  id: z.number(),
  name: z.string().min(1).trim(),
  createdAt: z.date(),
});

export class GameSession {
  id: number;
  name: string;
  createdAt: Date;

  constructor(id: number, name: string, createdAt: Date) {
    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
  }

  static async create(name: string) {
    schema.pick({ name: true }).parse({ name });
    const now = new Date();
    const id = await db.gameSessions.add({
      name,
      createdAt: now,
    });
    return new GameSession(id, name, now);
  }

  async update() {
    schema.parse(this);
    await db.gameSessions.put(this, this.id);
  }

  static async delete(id: number) {
    await db.gameSessions.delete(id);
  }

  static async getAll() {
    return db.gameSessions.toArray();
  }

  static async getById(id: number) {
    return db.gameSessions.get(id);
  }
}
