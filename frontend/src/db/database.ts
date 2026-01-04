import Dexie, { type EntityTable, type Table } from "dexie";

// Set up fake-indexeddb for test environment (bun test sets NODE_ENV=test)
if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
  const { indexedDB, IDBKeyRange } = await import("fake-indexeddb");
  Dexie.dependencies.indexedDB = indexedDB;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
}

import type {
  CategoryData,
  ChannelData,
  DiscordBotData,
  GameSessionData,
  GuildData,
  RoleData,
  TemplateData,
} from "./schemas";

export class DB extends Dexie {
  DiscordBot!: Table<DiscordBotData, string>;
  GameSession!: EntityTable<GameSessionData, "id">;
  Guild!: Table<GuildData, string>;
  Category!: Table<CategoryData, string>;
  Channel!: Table<ChannelData, string>;
  Role!: Table<RoleData, [string, string]>; // Composite key: [id, guildId]
  Template!: EntityTable<TemplateData, "id">;

  constructor() {
    super("GmAssistant");

    this.version(1).stores({
      DiscordBot: "id, name, token, icon",
      GameSession: "++id, name, guildId, botId, gameFlags, reactFlowData, createdAt, lastUsedAt",
      Guild: "id, name, icon",
      Category: "id, sessionId, name",
      Channel: "id, sessionId, name, type, *writerRoleIds, *readerRoleIds",
      Role: "[id+guildId], sessionId, name",
      Template: "++id, name, gameFlags, reactFlowData, createdAt, updatedAt",
    });
  }
}
