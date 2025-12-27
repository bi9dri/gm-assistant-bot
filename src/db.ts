import Dexie, { type EntityTable, type Table } from "dexie";
import z from "zod";

import * as models from "@/models";

export class DB extends Dexie {
  DiscordBot!: Table<z.infer<typeof models.DiscordBotSchema>, string>;
  GameSession!: EntityTable<z.infer<typeof models.GameSessionSchema>, "id">;
  Guild!: Table<z.infer<typeof models.GuildSchema>, string>;
  Category!: Table<z.infer<typeof models.CategorySchema>, string>;
  Channel!: Table<z.infer<typeof models.ChannelSchema>, string>;
  Role!: Table<z.infer<typeof models.RoleSchema>, string>;
  Template!: EntityTable<models.Template, "id">;

  constructor() {
    super("GmAssistant");

    this.version(1).stores({
      DiscordBot: "id, name, token, icon",
      GameSession: "++id, name, guildId, reactFlowData, createdAt, lastUsedAt",
      Guild: "id, name, icon",
      Category: "id, sessionId, name",
      Channel: "id, sessionId, name, type, *writerRoleIds, *readerRoleIds",
      Role: "[id+guildId], name",
      Template: "++id, name, reactFlowData, createdAt, updatedAt",
    });

    this.DiscordBot.mapToClass(models.DiscordBot);
    this.GameSession.mapToClass(models.GameSession);
    this.Guild.mapToClass(models.Guild);
    this.Category.mapToClass(models.Category);
    this.Channel.mapToClass(models.Channel);
    this.Role.mapToClass(models.Role);
    this.Template.mapToClass(models.Template);
  }
}

export const db = new DB();
