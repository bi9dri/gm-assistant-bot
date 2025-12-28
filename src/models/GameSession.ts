import { Entity } from "dexie";
import z from "zod";

import { db, type DB } from "@/db";
import {
  GameFlagsSchema,
  ReactFlowDataSchema,
  type GameFlags,
  type ReactFlowData,
} from "./Template";

export const GameSessionSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  guildId: z.string().trim().nonempty(),
  gameFlags: z.string(),
  reactFlowData: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
});

const defaultReactFlowData: ReactFlowData = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export class GameSession extends Entity<DB> {
  readonly id!: number;
  name!: string;
  readonly guildId!: string;
  gameFlags!: string; // JSON encoded string
  reactFlowData!: string; // JSON encoded string
  readonly createdAt!: Date;
  lastUsedAt!: Date;

  static async getById(id: number): Promise<GameSession | undefined> {
    return db.GameSession.get(id);
  }

  async update(options: {
    name?: string;
    gameFlags?: GameFlags;
    reactFlowData?: ReactFlowData;
  }): Promise<void> {
    const { name, gameFlags, reactFlowData } = options;

    const updateData: Partial<z.infer<typeof GameSessionSchema>> = {
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
