import { Entity } from "dexie";

import type { FlowData } from "@/flow/schema";
import { FlowDataSchema, defaultFlowData } from "@/flow/schema";
import { toScenarioDataV2 } from "@/scenario/migrate";
import type { ScenarioData } from "@/scenario/schema";
import { ScenarioDataSchema, defaultScenarioData } from "@/scenario/schema";

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
  readonly botId!: string;
  gameFlags!: string; // JSON encoded string
  reactFlowData!: string; // JSON encoded string
  flowData!: string; // JSON encoded string
  scenarioData!: string; // JSON encoded string
  readonly createdAt!: Date;
  lastUsedAt!: Date;

  static async getById(id: number): Promise<GameSession | undefined> {
    return db.GameSession.get(id) as Promise<GameSession | undefined>;
  }

  async update(options: {
    name?: string;
    gameFlags?: GameFlags;
    reactFlowData?: ReactFlowData;
    flowData?: FlowData;
    scenarioData?: ScenarioData;
  }): Promise<void> {
    const { name, gameFlags, reactFlowData, flowData, scenarioData } = options;

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

    if (flowData !== undefined) {
      FlowDataSchema.parse(flowData);
      updateData.flowData = JSON.stringify(flowData);
    }

    if (scenarioData !== undefined) {
      ScenarioDataSchema.parse(scenarioData);
      updateData.scenarioData = JSON.stringify(scenarioData);
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
    if (flowData !== undefined) {
      this.flowData = JSON.stringify(flowData);
    }
    if (scenarioData !== undefined) {
      this.scenarioData = JSON.stringify(scenarioData);
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

  getParsedFlowData(): FlowData {
    try {
      const parsed = JSON.parse(this.flowData);
      return FlowDataSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse flowData:", error);
      return defaultFlowData;
    }
  }

  getParsedScenarioData(): ScenarioData {
    try {
      // Dexie v10 が既存行を v2 へ移すが、取り込みなど別経路で入った v1 も読めるようにする。
      const parsed = toScenarioDataV2(JSON.parse(this.scenarioData));
      return ScenarioDataSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse scenarioData:", error);
      return defaultScenarioData;
    }
  }
}
