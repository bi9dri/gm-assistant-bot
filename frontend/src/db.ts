import Dexie, { type EntityTable } from "dexie";
import { DiscordWebhook } from "./models/discordWebhook";
import { DiscordProfile } from "./models/discordProfile";

export const db = new Dexie("GmAssistant") as Dexie & {
  discordWebhooks: EntityTable<DiscordWebhook, "id">;
  discordProfiles: EntityTable<DiscordProfile, "id">;
};

db.version(1).stores({
  discordWebhooks: "++id, name, url",
  discordProfiles: "++id, name, icon, description",
});
