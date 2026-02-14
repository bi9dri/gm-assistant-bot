import Dexie, { type EntityTable, type Table } from "dexie";
import z from "zod";

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

const ReactFlowNodeSchema = z.looseObject({
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const ReactFlowDataMigrationSchema = z.looseObject({
  nodes: z.array(ReactFlowNodeSchema),
});

const SendMessageNodeV1Data = z.object({
  channelName: z.string(),
});

const CreateCategoryNodeV1Data = z.object({
  categoryName: z.string(),
});

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

    this.version(2).upgrade(async (tx) => {
      const migrateReactFlowData = (reactFlowDataStr: string): string => {
        let parsed: z.infer<typeof ReactFlowDataMigrationSchema>;
        try {
          parsed = ReactFlowDataMigrationSchema.parse(JSON.parse(reactFlowDataStr));
        } catch {
          return reactFlowDataStr;
        }

        let modified = false;
        for (const node of parsed.nodes) {
          if (node.type === "SendMessage" && node.data) {
            const v1 = SendMessageNodeV1Data.safeParse(node.data);
            if (v1.success) {
              const name = v1.data.channelName;
              node.data.channelNames = name.trim() === "" ? [""] : [name];
              delete node.data.channelName;
              modified = true;
            }
          }

          if (node.type === "CreateCategory" && node.data) {
            const v1 = CreateCategoryNodeV1Data.safeParse(node.data);
            if (v1.success) {
              node.data.categoryName = {
                type: "literal",
                value: v1.data.categoryName,
              };
              modified = true;
            }
          }
        }

        return modified ? JSON.stringify(parsed) : reactFlowDataStr;
      };

      await tx
        .table("Template")
        .toCollection()
        .modify((template) => {
          template.reactFlowData = migrateReactFlowData(template.reactFlowData);
        });

      await tx
        .table("GameSession")
        .toCollection()
        .modify((session) => {
          session.reactFlowData = migrateReactFlowData(session.reactFlowData);
        });
    });
  }
}
