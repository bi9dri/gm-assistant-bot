import { z } from "zod";
import { ZodError } from "zod";
import { db } from "../db";

// Zodスキーマ定義
const discordWebhookUrl = z.string().url().refine(
  (url) => {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname === "discord.com" &&
        urlObj.pathname.startsWith("/api/webhooks/")
      );
    } catch {
      return false;
    }
  },
  {
    message: "有効なDiscord Webhook URLを入力してください",
  }
);

export const discordWebhookSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "名前は必須です").trim(),
  url: discordWebhookUrl,
});

// 型定義
export type DiscordWebhookType = z.infer<typeof discordWebhookSchema>;

// モデルクラス
export class DiscordWebhook {
  id?: number;
  name: string;
  url: string;

  constructor(name: string, url: string, id?: number) {
    this.name = name;
    this.url = url;
    this.id = id;
  }

  validate(): { valid: boolean; errors: string[] } {
    try {
      discordWebhookSchema.parse({
        id: this.id,
        name: this.name,
        url: this.url,
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
      await db.webhooks.update(this.id, {
        name: this.name,
        url: this.url,
      });
      return this.id;
    } else {
      const id = await db.webhooks.add(this);
      this.id = id as number;
      return id as number;
    }
  }

  async delete(): Promise<void> {
    if (this.id) {
      await db.webhooks.delete(this.id);
    }
  }

  static async getAll(): Promise<DiscordWebhook[]> {
    return await db.webhooks.toArray();
  }

  static async getById(id: number): Promise<DiscordWebhook | undefined> {
    return await db.webhooks.get(id);
  }

  static async findByName(name: string): Promise<DiscordWebhook[]> {
    return await db.webhooks.where("name").equals(name).toArray();
  }

  static async deleteById(id: number): Promise<void> {
    await db.webhooks.delete(id);
  }
}
