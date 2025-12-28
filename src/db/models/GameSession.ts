import { Entity } from "dexie";

import type { DB } from "../database";

import { db } from "../instance";
import {
  GameFlagsSchema,
  ReactFlowDataSchema,
  defaultReactFlowData,
  type GameFlags,
  type GameSessionData,
  type ReactFlowData,
} from "../schemas";

export class GameSession extends Entity<DB> {
  readonly id!: number;
  name!: string;
  readonly guildId!: string;
  gameFlags!: string; // JSON encoded string
  reactFlowData!: string; // JSON encoded string
  readonly createdAt!: Date;
  lastUsedAt!: Date;

  static async getById(id: number): Promise<GameSession | undefined> {
    return db.GameSession.get(id) as Promise<GameSession | undefined>;
  }

  async update(options: {
    name?: string;
    gameFlags?: GameFlags;
    reactFlowData?: ReactFlowData;
  }): Promise<void> {
    const { name, gameFlags, reactFlowData } = options;

    const updateData: Partial<GameSessionData> = {
      lastUsedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (gameFlags !== undefined) {
      GameFlagsSchema.parse(gameFlags);
      updateData.gameFlags = JSON.stringify(gameFlags);
    }

    if (reactFlowData !== undefined) {
      ReactFlowDataSchema.parse(reactFlowData);
      updateData.reactFlowData = JSON.stringify(reactFlowData);
    }

    await db.GameSession.update(this.id, updateData);

    if (name !== undefined) {
      this.name = name.trim();
    }
    if (gameFlags !== undefined) {
      this.gameFlags = JSON.stringify(gameFlags);
    }
    if (reactFlowData !== undefined) {
      this.reactFlowData = JSON.stringify(reactFlowData);
    }
    if (updateData.lastUsedAt) {
      this.lastUsedAt = updateData.lastUsedAt;
    }
  }

  getParsedGameFlags(): GameFlags {
    try {
      const parsed = JSON.parse(this.gameFlags);
      return GameFlagsSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse gameFlags:", error);
      return {};
    }
  }

  getParsedReactFlowData(): ReactFlowData {
    try {
      const parsed = JSON.parse(this.reactFlowData);
      return ReactFlowDataSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse reactFlowData:", error);
      return defaultReactFlowData;
    }
  }
}
