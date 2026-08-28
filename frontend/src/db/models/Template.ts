import { Entity } from "dexie";

import { reactFlowToFlowData } from "@/flow/migrate";
import type { FlowData } from "@/flow/schema";
import { FlowDataSchema, defaultFlowData } from "@/flow/schema";

import type { DB } from "../database";
import { db } from "../instance";
import {
  GameFlagsSchema,
  ReactFlowDataSchema,
  TemplateExportSchema,
  TemplateMetaSchema,
  defaultReactFlowData,
  type GameFlags,
  type ReactFlowData,
  type TemplateData,
  type TemplateExport,
  type TemplateMeta,
} from "../schemas";

export class Template extends Entity<DB> {
  readonly id!: number;
  name!: string;
  gameFlags!: string; // JSON encoded string
  reactFlowData!: string; // JSON encoded string
  flowData!: string; // JSON encoded string
  readonly createdAt!: Date;
  updatedAt!: Date;
  system?: string;
  playerCountMin?: number;
  playerCountMax?: number;
  durationMinutesMin?: number;
  durationMinutesMax?: number;
  coverPath?: string;

  static async create(name: string): Promise<Template> {
    const id = await db.Template.add({
      name: name.trim(),
      gameFlags: JSON.stringify({}),
      reactFlowData: JSON.stringify(defaultReactFlowData),
      flowData: JSON.stringify(defaultFlowData),
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
    flowData?: FlowData;
    meta?: TemplateMeta;
  }): Promise<void> {
    const { name, gameFlags, reactFlowData, flowData, meta } = options;

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

    if (flowData !== undefined) {
      FlowDataSchema.parse(flowData);
      updateData.flowData = JSON.stringify(flowData);
    }

    // メタ情報は全項目まとめて置き換える。渡されなかった項目は undefined になり、
    // Dexie がプロパティ削除として扱う (= クリア)。
    const normalizedMeta = meta && {
      system: meta.system,
      playerCountMin: meta.playerCountMin,
      playerCountMax: meta.playerCountMax,
      durationMinutesMin: meta.durationMinutesMin,
      durationMinutesMax: meta.durationMinutesMax,
      coverPath: meta.coverPath,
    };

    if (normalizedMeta !== undefined) {
      TemplateMetaSchema.parse(normalizedMeta);
      Object.assign(updateData, normalizedMeta);
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
    if (flowData !== undefined) {
      this.flowData = JSON.stringify(flowData);
    }
    if (normalizedMeta !== undefined) {
      Object.assign(this, normalizedMeta);
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

  getParsedFlowData(): FlowData {
    try {
      const parsed = JSON.parse(this.flowData);
      return FlowDataSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse flowData:", error);
      return defaultFlowData;
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
    // flowData は reactFlowData から導出する (両者のファイルパスは常に一致させる)。
    // インポート経路のパス書き換え (files/ → template/{id}/) は fileSystem.ts の
    // importTemplate が reactFlowData / flowData 双方に対して行う。
    await template.update({
      gameFlags: validated.gameFlags,
      reactFlowData: validated.reactFlowData,
      flowData: reactFlowToFlowData(validated.reactFlowData),
    });

    return template;
  }
}
