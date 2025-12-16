import { z } from "zod";
import { db } from "../db";

export const discordWebhookSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).trim(),
  url: z.url().includes("discord.com/").includes("webhooks"),
});

export type DiscordWebhookType = z.infer<typeof discordWebhookSchema>;

export class DiscordWebhook {
  id?: number;
  name: string;
  url: string;

  constructor(name: string, url: string, id?: number) {
    this.name = name;
    this.url = url;
    this.id = id;
  }

  async save() {
    discordWebhookSchema.parse({ ...this });
    const key = await db.discordWebhooks.put(this);
    if (!key) {
      throw new Error("Failed to save DiscordWebhook");
    }
    return key;
  }

  static async delete(id: number) {
    await db.discordWebhooks.delete(id);
  }

  static async getAll() {
    return db.discordWebhooks.toArray();
  }

  static async getById(id: number) {
    return db.discordWebhooks.get(id);
  }
}
