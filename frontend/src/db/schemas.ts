import z from "zod";

const DiscordBotSchema = z.object({
  id: z.string().nonempty().trim(),
  name: z.string().nonempty().trim(),
  token: z.string().nonempty().trim(),
  icon: z.url(),
});

export const GuildSchema = z.object({
  id: z.string().nonempty().trim(),
  name: z.string().nonempty().trim(),
  icon: z.url().optional(),
});

const CategorySchema = z.object({
  id: z.string().nonempty().trim(),
  sessionId: z.number().int(),
  name: z.string().nonempty().trim(),
});

const ChannelSchema = z.object({
  id: z.string().nonempty().trim(),
  sessionId: z.number().int(),
  name: z.string().nonempty().trim(),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string()),
  readerRoleIds: z.array(z.string()),
});

const RoleSchema = z.object({
  id: z.string().nonempty().trim(),
  guildId: z.string().nonempty().trim(),
  sessionId: z.number().int().optional(),
  name: z.string().nonempty().trim(),
});

export const GameFlagsSchema = z.record(z.string(), z.any());

export const ReactFlowDataSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }),
});

export type ReactFlowData = z.infer<typeof ReactFlowDataSchema>;

export const defaultReactFlowData: ReactFlowData = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const GameSessionSchema = z.object({
  id: z.number().int(),
  name: z.string().nonempty().trim(),
  guildId: z.string().nonempty().trim(),
  botId: z.string().nonempty().trim(),
  gameFlags: z.string(),
  reactFlowData: z.string(),
  flowData: z.string(),
  scenarioData: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
});

export const TemplateMetaSchema = z.object({
  system: z.string().optional(),
  playerCountMin: z.number().int().positive().optional(),
  playerCountMax: z.number().int().positive().optional(),
  durationMinutesMin: z.number().int().positive().optional(),
  durationMinutesMax: z.number().int().positive().optional(),
  coverPath: z.string().optional(),
});

const TemplateSchema = z.object({
  id: z.number().int(),
  name: z.string().nonempty().trim(),
  gameFlags: z.string(),
  reactFlowData: z.string(),
  flowData: z.string(),
  scenarioData: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  ...TemplateMetaSchema.shape,
});

export const TemplateExportSchema = z.object({
  version: z.literal(1),
  name: z.string().nonempty().trim(),
  gameFlags: GameFlagsSchema,
  reactFlowData: ReactFlowDataSchema,
});

export type DiscordBotData = z.infer<typeof DiscordBotSchema>;
export type GuildData = z.infer<typeof GuildSchema>;
export type CategoryData = z.infer<typeof CategorySchema>;
export type ChannelData = z.infer<typeof ChannelSchema>;
export type RoleData = z.infer<typeof RoleSchema>;

export type GameFlags = z.infer<typeof GameFlagsSchema>;

export type GameSessionData = z.infer<typeof GameSessionSchema>;
export type TemplateData = z.infer<typeof TemplateSchema>;
export type TemplateMeta = z.infer<typeof TemplateMetaSchema>;

export type TemplateExport = z.infer<typeof TemplateExportSchema>;
