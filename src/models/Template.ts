import { Entity } from "dexie";
import z from "zod";

import { db, DB } from "@/db";

export const GameFlagsSchema = z.record(z.string(), z.any());
export type GameFlags = z.infer<typeof GameFlagsSchema>;

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
const defaultReactFlowData: ReactFlowData = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const TemplateSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  gameFlags: z.string().default(JSON.stringify({})),
  reactFlowData: z.string().default(JSON.stringify(defaultReactFlowData)),
  createdAt: z.date(),
  updatedAt: z.date(),
});

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
    return template;
  }

  static async getById(id: number): Promise<Template | undefined> {
    return db.Template.get(id);
  }

  static async getAll(): Promise<Template[]> {
    return db.Template.toArray();
  }

  async update(options: {
    name?: string;
    gameFlags?: GameFlags;
    reactFlowData?: ReactFlowData;
  }): Promise<void> {
    const { name, gameFlags, reactFlowData } = options;

    const updateData: Partial<z.infer<typeof TemplateSchema>> = {
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
}
