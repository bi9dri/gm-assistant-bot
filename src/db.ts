import Dexie, { type EntityTable, type Table } from "dexie";
import z from "zod";

import * as models from "@/models";

export class DB extends Dexie {
  DiscordBot!: Table<z.infer<typeof models.DiscordBotSchema>, "id">;
  GameSession!: EntityTable<z.infer<typeof models.GameSessionSchema>, "id">;
  SessionNode!: EntityTable<z.infer<typeof models.SessionNodeSchema>, "id">;
  Guild!: Table<z.infer<typeof models.GuildSchema>, "id">;
  Category!: Table<z.infer<typeof models.CategorySchema>, "id">;
  Channel!: Table<z.infer<typeof models.ChannelSchema>, "id">;
  Role!: Table<z.infer<typeof models.RoleSchema>, ["id", "guildId"]>;
  Template!: EntityTable<models.Template, "id", z.infer<typeof models.TemplateInsertSchema>>;
  TemplateNode!: EntityTable<models.TemplateNode, "id">;

  constructor() {
    super("GmAssistant");

    this.version(1).stores({
      DiscordBot: "id, name, token, icon",
      GameSession: "++id, name, guildId, createdAt",
      SessionNode: "++id, sessionId, description, executedAt",
      Guild: "id, name, icon",
      Category: "id, sessionId, name",
      Channel: "id, sessionId, name, type, *writerRoleIds, *readerRoleIds",
      Role: "[id+guildId], name",
      Template: "++id, name, createdAt, updatedAt",
      TemplateNode: "++id, templateId, description",
    });

    this.DiscordBot.mapToClass(models.DiscordBot);
    this.GameSession.mapToClass(models.GameSession);
    this.SessionNode.mapToClass(models.SessionNode);
    this.Guild.mapToClass(models.Guild);
    this.Category.mapToClass(models.Category);
    this.Channel.mapToClass(models.Channel);
    this.Role.mapToClass(models.Role);
    this.Template.mapToClass(models.Template);
    this.TemplateNode.mapToClass(models.TemplateNode);
  }
}

export const db = new DB();
