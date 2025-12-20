import z from "zod";

export const createRoleSchema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const deleteRoleSchema = z.object({
  guildId: z.string().min(1),
  roleId: z.string().min(1),
});

export const createCategorySchema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const createChannelSchema = z.object({
  guildId: z.string().min(1),
  parentCategoryId: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string()),
  readerRoleIds: z.array(z.string()),
});

export const changeChannelPermissionsSchema = z.object({
  channelId: z.string().min(1),
  writerRoleIds: z.array(z.string()),
  readerRoleIds: z.array(z.string()),
});

export const deleteChannelSchema = z.object({
  guildId: z.string().min(1),
  channelId: z.string().min(1),
});

export type CreateRoleData = z.infer<typeof createRoleSchema>;
export type DeleteRoleData = z.infer<typeof deleteRoleSchema>;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type CreateChannelData = z.infer<typeof createChannelSchema>;
export type ChangeChannelPermissionsData = z.infer<typeof changeChannelPermissionsSchema>;
export type DeleteChannelData = z.infer<typeof deleteChannelSchema>;
