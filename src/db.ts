import Dexie, { type EntityTable } from "dexie";
import { DiscordWebhook } from "./models/discordWebhook";
import { DiscordProfile } from "./models/discordProfile";

export const db = new Dexie("GmAssistant") as Dexie & {
  webhooks: EntityTable<DiscordWebhook, "id">;
  profiles: EntityTable<DiscordProfile, "id">;
};

db.version(1).stores({
  webhooks: "++id, name, url",
  profiles: "++id, name, icon, description",
});
