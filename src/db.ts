import Dexie, { type EntityTable } from "dexie";
import { DiscordWebhook } from "./models/DiscordWebhook";
import { DiscordProfile } from "./models/DiscordProfile";

export const db = new Dexie("GmAssistant") as Dexie & {
  webhooks: EntityTable<DiscordWebhook, "id">;
  profiles: EntityTable<DiscordProfile, "id">;
};

db.version(1).stores({
  webhooks: "++id, name, url",
  profiles: "++id, name, icon, description",
});
