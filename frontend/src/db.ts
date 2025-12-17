import Dexie, { type EntityTable } from "dexie";
import type { GameSession } from "./models/gameSession";
import type { Template } from "./models/template";

export const db = new Dexie("GmAssistant") as Dexie & {
  gameSessions: EntityTable<GameSession, "id">;
  templates: EntityTable<Template, "id">;
};

db.version(1).stores({
  discordWebhooks: "++id, name, url",
  discordProfiles: "++id, name, icon, description",
});

db.version(2).stores({
  DiscordWebhooks: null,
  discordProfiles: null,
  gameSessions: "++id, name, createdAt",
  templates: "++id, name, *roles, *channels, createdAt, updatedAt",
});
