import { z } from "zod";
import { ZodError } from "zod";
import { db } from "../db";

export const discordProfileSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "名前は必須です").trim(),
  icon: z.url("有効なアイコンURLを入力してください"),
  description: z.string().max(500, "説明は500文字以内で入力してください").default(""),
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

  validate(): { valid: boolean; errors: string[] } {
    try {
      discordProfileSchema.parse({
        id: this.id,
        name: this.name,
        icon: this.icon,
        description: this.description,
      });
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: error.issues.map((issue) => issue.message),
        };
      }
      return { valid: false, errors: ["バリデーションエラーが発生しました"] };
    }
  }

  async save(): Promise<number> {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`バリデーションエラー: ${validation.errors.join(", ")}`);
    }

    if (this.id) {
      await db.profiles.update(this.id, {
        name: this.name,
        icon: this.icon,
        description: this.description,
      });
      return this.id;
    } else {
      const id = await db.profiles.add(this);
      this.id = id as number;
      return id as number;
    }
  }

  async delete(): Promise<void> {
    if (this.id) {
      await db.profiles.delete(this.id);
    }
  }

  static async getAll(): Promise<DiscordProfile[]> {
    return await db.profiles.toArray();
  }

  static async getById(id: number): Promise<DiscordProfile | undefined> {
    return await db.profiles.get(id);
  }

  static async findByName(name: string): Promise<DiscordProfile[]> {
    return await db.profiles.where("name").equals(name).toArray();
  }

  static async deleteById(id: number): Promise<void> {
    await db.profiles.delete(id);
  }
}
