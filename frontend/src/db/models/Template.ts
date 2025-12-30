import { Entity } from "dexie";

import type { DB } from "../database";

import { db } from "../instance";
import {
  GameFlagsSchema,
  ReactFlowDataSchema,
  TemplateExportSchema,
  defaultReactFlowData,
  type GameFlags,
  type ReactFlowData,
  type TemplateData,
  type TemplateExport,
} from "../schemas";

export class Template extends Entity<DB> {
  readonly id!: number;
  name!: string;
  gameFlags!: string; // JSON encoded string
  reactFlowData!: string; // JSON encoded string
  readonly createdAt!: Date;
  updatedAt!: Date;

  static async create(name: string): Promise<Template> {
    const id = await db.Template.add({
      name: name.trim(),
      gameFlags: JSON.stringify({}),
      reactFlowData: JSON.stringify(defaultReactFlowData),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const template = await db.Template.get(id);
    if (!template) {
      throw new Error("Failed to create template");
    }
    return template as Template;
  }

  static async getById(id: number): Promise<Template | undefined> {
    return db.Template.get(id) as Promise<Template | undefined>;
  }

  static async getAll(): Promise<Template[]> {
    return db.Template.toArray() as unknown as Promise<Template[]>;
  }

  async update(options: {
    name?: string;
    gameFlags?: GameFlags;
    reactFlowData?: ReactFlowData;
  }): Promise<void> {
    const { name, gameFlags, reactFlowData } = options;

    const updateData: Partial<TemplateData> = {
      updatedAt: new Date(),
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

    await db.Template.update(this.id, updateData);

    if (name !== undefined) {
      this.name = name.trim();
    }
    if (gameFlags !== undefined) {
      this.gameFlags = JSON.stringify(gameFlags);
    }
    if (reactFlowData !== undefined) {
      this.reactFlowData = JSON.stringify(reactFlowData);
    }
    if (updateData.updatedAt) {
      this.updatedAt = updateData.updatedAt;
    }
  }

  static async delete(id: number): Promise<void> {
    await db.Template.delete(id);
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

  export(): TemplateExport {
    return {
      version: 1,
      name: this.name,
      gameFlags: this.getParsedGameFlags(),
      reactFlowData: this.getParsedReactFlowData(),
    };
  }

  static async import(data: unknown): Promise<Template> {
    const validated = TemplateExportSchema.parse(data);

    if (validated.version !== 1) {
      throw new Error("サポートされていないバージョンです");
    }

    const template = await Template.create(validated.name);
    await template.update({
      gameFlags: validated.gameFlags,
      reactFlowData: validated.reactFlowData,
    });

    return template;
  }
}
