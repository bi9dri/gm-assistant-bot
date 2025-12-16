import { z } from "zod";
import { db } from "../db";

export const discordProfileSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).trim(),
  icon: z.url().optional(),
  description: z.string().max(500).default(""),
});

export type DiscordProfileType = z.infer<typeof discordProfileSchema>;

export class DiscordProfile {
  id?: number;
  name: string;
  icon: string;
  description: string;

  constructor(name: string, icon: string, description: string, id?: number) {
    this.name = name;
    this.icon = icon;
    this.description = description;
    this.id = id;
  }

  async save() {
    discordProfileSchema.parse({ ...this });
    const key = await db.discordProfiles.put(this);
    if (!key) {
      throw new Error("Failed to save DiscordProfile");
    }
    return key;
  }

  static async delete(id: number) {
    await db.discordProfiles.delete(id);
  }

  static async getAll() {
    return db.discordProfiles.toArray();
  }
}
