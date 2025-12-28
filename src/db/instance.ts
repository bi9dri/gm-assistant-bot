import { DB } from "./database";
import { Category } from "./models/Category";
import { Channel } from "./models/Channel";
import { DiscordBot } from "./models/DiscordBot";
import { GameSession } from "./models/GameSession";
import { Guild } from "./models/Guild";
import { Role } from "./models/Role";
import { Template } from "./models/Template";

export const db = new DB();

db.DiscordBot.mapToClass(DiscordBot);
db.GameSession.mapToClass(GameSession);
db.Guild.mapToClass(Guild);
db.Category.mapToClass(Category);
db.Channel.mapToClass(Channel);
db.Role.mapToClass(Role);
db.Template.mapToClass(Template);
