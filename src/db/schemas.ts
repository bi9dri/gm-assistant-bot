import z from "zod";

// ========================================
// Basic Entity Schemas
// ========================================

export const DiscordBotSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  token: z.string().trim().min(1),
  icon: z.string().url(),
});

export const GuildSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  icon: z.string().url().optional(),
});

export const CategorySchema = z.object({
  id: z.string().trim().min(1),
  sessionId: z.number().int(),
  name: z.string().trim().min(1),
});

export const ChannelSchema = z.object({
  id: z.string().trim().min(1),
  sessionId: z.number().int(),
  name: z.string().trim().min(1),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string()),
  readerRoleIds: z.array(z.string()),
});

export const RoleSchema = z.object({
  id: z.string().trim().min(1),
  guildId: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

// ========================================
// JSON Structure Schemas (for gameFlags and reactFlowData)
// ========================================

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

// ========================================
// Complex Entity Schemas (with JSON fields)
// ========================================

export const GameSessionSchema = z.object({
  id: z.number().int(),
  name: z.string().trim().min(1),
  guildId: z.string().trim().min(1),
  gameFlags: z.string(), // JSON encoded
  reactFlowData: z.string(), // JSON encoded
  createdAt: z.date(),
  lastUsedAt: z.date(),
});

export const TemplateSchema = z.object({
  id: z.number().int(),
  name: z.string().trim().min(1),
  gameFlags: z.string(), // JSON encoded
  reactFlowData: z.string(), // JSON encoded
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ========================================
// Import/Export Schemas
// ========================================

export const TemplateExportSchema = z.object({
  version: z.literal(1),
  name: z.string().trim().min(1),
  gameFlags: GameFlagsSchema,
  reactFlowData: ReactFlowDataSchema,
});

// ========================================
// Type Exports
// ========================================

export type DiscordBotData = z.infer<typeof DiscordBotSchema>;
export type GuildData = z.infer<typeof GuildSchema>;
export type CategoryData = z.infer<typeof CategorySchema>;
export type ChannelData = z.infer<typeof ChannelSchema>;
export type RoleData = z.infer<typeof RoleSchema>;

export type GameFlags = z.infer<typeof GameFlagsSchema>;
// ReactFlowData already exported above

export type GameSessionData = z.infer<typeof GameSessionSchema>;
export type TemplateData = z.infer<typeof TemplateSchema>;

export type TemplateExport = z.infer<typeof TemplateExportSchema>;
