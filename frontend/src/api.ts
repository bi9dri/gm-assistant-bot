import { hc, type InferRequestType } from "hono/client";

import type { AppType } from "../../backend/src/index";

const API_BASE_URL = import.meta.env.DEV ? "" : "https://gm-assistant-bot-api.bidri.dev";

export const BOT_TOKEN_HEADER = "X-Discord-Bot-Token";

/**
 * Extract error message from unknown error object.
 * https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
 */
function getErrorMessage(error: unknown, fallback: string | number): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "error" in error &&
    typeof (error as Record<string, unknown>).error === "string"
  ) {
    return (error as Record<string, unknown>).error as string;
  }
  return String(fallback);
}

type Client = ReturnType<typeof hc<AppType>>;

type CreateRoleRequest = InferRequestType<Client["api"]["roles"]["$post"]>["json"];
type DeleteRoleRequest = InferRequestType<Client["api"]["roles"]["$delete"]>["json"];
type CreateCategoryRequest = InferRequestType<Client["api"]["categories"]["$post"]>["json"];
type CreateChannelRequest = InferRequestType<Client["api"]["channels"]["$post"]>["json"];
type DeleteChannelRequest = InferRequestType<Client["api"]["channels"]["$delete"]>["json"];
type ChangeChannelPermissionsRequest = InferRequestType<
  Client["api"]["channels"]["permissions"]["$patch"]
>["json"];
type AddRoleToRoleMembersRequest = InferRequestType<
  Client["api"]["roles"]["addRoleToRoleMembers"]["$post"]
>["json"];
type AddRoleToMemberRequest = InferRequestType<
  Client["api"]["roles"]["addRoleToMember"]["$post"]
>["json"];
type ListGuildMembersRequest = InferRequestType<Client["api"]["members"]["$get"]>["query"];
type SendMessageRequest = InferRequestType<Client["api"]["messages"]["$post"]>["form"];
type SendVoteRequest = InferRequestType<Client["api"]["messages"]["vote"]["$post"]>["json"];
type GetVoteResultRequest = InferRequestType<Client["api"]["messages"]["vote"]["$get"]>["query"];

export class ApiClient {
  private readonly client: Client["api"];

  constructor(token: string) {
    const client = hc<AppType>(API_BASE_URL, {
      headers: {
        [BOT_TOKEN_HEADER]: token,
      },
    });
    this.client = client.api;
  }

  async getProfile() {
    const res = await this.client.profile.$get();
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to get profile: ${getErrorMessage(error, res.status)}`);
    }
    const data = await res.json();
    return data.profile;
  }

  async getGuilds() {
    const res = await this.client.guilds.$get();
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to get guilds: ${getErrorMessage(error, res.status)}`);
    }
    const data = await res.json();
    return data.guilds;
  }

  async createRole(data: CreateRoleRequest) {
    const res = await this.client.roles.$post({ json: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create role: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.role;
  }

  async deleteRole(data: DeleteRoleRequest) {
    const res = await this.client.roles.$delete({ json: data });
    if (!res.ok) {
      throw new Error(`Failed to delete role: ${res.status}`);
    }
  }

  async createCategory(data: CreateCategoryRequest) {
    const res = await this.client.categories.$post({ json: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create category: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.category;
  }

  async createChannel(data: CreateChannelRequest) {
    const res = await this.client.channels.$post({ json: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create channel: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.channel;
  }

  async changeChannelPermissions(data: ChangeChannelPermissionsRequest) {
    const res = await this.client.channels.permissions.$patch({ json: data });
    if (!res.ok) {
      throw new Error(`Failed to change channel permissions: ${res.status}`);
    }
  }

  async deleteChannel(data: DeleteChannelRequest) {
    const res = await this.client.channels.$delete({ json: data });
    if (!res.ok) {
      throw new Error(`Failed to delete channel: ${res.status}`);
    }
  }

  async addRoleToRoleMembers(data: AddRoleToRoleMembersRequest) {
    const res = await this.client.roles.addRoleToRoleMembers.$post({ json: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to add role to role members: ${getErrorMessage(error, res.status)}`);
    }
  }

  async addRoleToMember(data: AddRoleToMemberRequest) {
    const res = await this.client.roles.addRoleToMember.$post({ json: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to add role to member: ${getErrorMessage(error, res.status)}`);
    }
  }

  async listGuildMembers(data: ListGuildMembersRequest) {
    const res = await this.client.members.$get({ query: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to list guild members: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.members;
  }

  async sendVote(data: SendVoteRequest) {
    const res = await this.client.messages.vote.$post({ json: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to send vote: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.message;
  }

  async getVoteResult(data: GetVoteResultRequest) {
    const res = await this.client.messages.vote.$get({ query: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to get vote result: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.reactions;
  }

  async sendMessage(data: SendMessageRequest) {
    const res = await this.client.messages.$post({ form: data });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to send message: ${getErrorMessage(error, res.status)}`);
    }
  }
}
