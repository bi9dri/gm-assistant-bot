import z from "zod";

export const BOT_TOKEN_HEADER = "X-Discord-Bot-Token";

export const createRoleSchema = z.object({
  guildId: z.string().nonempty().trim(),
  name: z.string().nonempty().trim(),
});

export const deleteRoleSchema = z.object({
  guildId: z.string().nonempty().trim(),
  roleId: z.string().nonempty().trim(),
});

export const createCategorySchema = z.object({
  guildId: z.string().nonempty().trim(),
  name: z.string().nonempty().trim(),
});

export const createChannelSchema = z.object({
  guildId: z.string().nonempty().trim(),
  parentCategoryId: z.string().nonempty().trim(),
  name: z.string().nonempty().trim(),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string().nonempty().trim()),
  readerRoleIds: z.array(z.string().nonempty().trim()),
});

export const changeChannelPermissionsSchema = z.object({
  channelId: z.string().nonempty().trim(),
  writerRoleIds: z.array(z.string().nonempty().trim()),
  readerRoleIds: z.array(z.string().nonempty().trim()),
});

export const deleteChannelSchema = z.object({
  guildId: z.string().nonempty().trim(),
  channelId: z.string().nonempty().trim(),
});

export const addRoleToRoleMembersSchema = z.object({
  guildId: z.string().nonempty().trim(),
  memberRoleId: z.string().nonempty().trim(),
  addRoleId: z.string().nonempty().trim(),
});

export type CreateRoleData = z.infer<typeof createRoleSchema>;
export type DeleteRoleData = z.infer<typeof deleteRoleSchema>;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type CreateChannelData = z.infer<typeof createChannelSchema>;
export type ChangeChannelPermissionsData = z.infer<typeof changeChannelPermissionsSchema>;
export type DeleteChannelData = z.infer<typeof deleteChannelSchema>;
export type AddRoleToRoleMembersData = z.infer<typeof addRoleToRoleMembersSchema>;
