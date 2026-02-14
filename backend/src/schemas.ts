import z from "zod";

export const BOT_TOKEN_HEADER = "X-Discord-Bot-Token";

export const createRoleSchema = z.object({
  guildId: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
});

export const deleteRoleSchema = z.object({
  guildId: z.string().trim().nonempty(),
  roleId: z.string().trim().nonempty(),
});

export const createCategorySchema = z.object({
  guildId: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
});

export const createChannelSchema = z.object({
  guildId: z.string().trim().nonempty(),
  parentCategoryId: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string().trim().nonempty()),
  readerRoleIds: z.array(z.string().trim().nonempty()),
});

export const changeChannelPermissionsSchema = z.object({
  guildId: z.string().trim().nonempty(),
  channelId: z.string().trim().nonempty(),
  writerRoleIds: z.array(z.string().trim().nonempty()),
  readerRoleIds: z.array(z.string().trim().nonempty()),
});

export const deleteChannelSchema = z.object({
  guildId: z.string().trim().nonempty(),
  channelId: z.string().trim().nonempty(),
});

export const addRoleToRoleMembersSchema = z.object({
  guildId: z.string().trim().nonempty(),
  memberRoleId: z.string().trim().nonempty(),
  addRoleId: z.string().trim().nonempty(),
});

export const sendMessageSchema = z.object({
  channelId: z.string().trim().nonempty(),
  content: z.string().trim().nonempty(),
  files: z.union([z.instanceof(File), z.array(z.instanceof(File)).max(4)]).optional(),
});

export type CreateRoleData = z.infer<typeof createRoleSchema>;
export type DeleteRoleData = z.infer<typeof deleteRoleSchema>;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type CreateChannelData = z.infer<typeof createChannelSchema>;
export type ChangeChannelPermissionsData = z.infer<typeof changeChannelPermissionsSchema>;
export type DeleteChannelData = z.infer<typeof deleteChannelSchema>;
export type AddRoleToRoleMembersData = z.infer<typeof addRoleToRoleMembersSchema>;
export type SendMessageData = z.infer<typeof sendMessageSchema>;
