import Dexie, { type EntityTable, type Table, type Transaction } from "dexie";
import z from "zod";

// Set up fake-indexeddb for test environment (bun test sets NODE_ENV=test)
if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
  const { indexedDB, IDBKeyRange } = await import("fake-indexeddb");
  Dexie.dependencies.indexedDB = indexedDB;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
}

import { applyFlowDataMigration } from "../flow/migrate";
import { toScenarioDataV2 } from "../scenario/migrate";
import type {
  CategoryData,
  ChannelData,
  DiscordBotData,
  GameSessionData,
  GuildData,
  RoleData,
  TemplateData,
} from "./schemas";

const ReactFlowNodeSchema = z.looseObject({
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const ReactFlowDataMigrationSchema = z.looseObject({
  nodes: z.array(ReactFlowNodeSchema),
});

const ConditionalBranchConditionSchema = z.object({
  id: z.string(),
  flagKey: z.string(),
  operator: z.string(),
  value: z.string(),
});

const ConditionalBranchNodeV3Data = z.object({
  conditions: z.array(ConditionalBranchConditionSchema),
});

const ConditionalBranchConditionV4Schema = z.object({
  id: z.string(),
  flagKey: z.string(),
  operator: z.string(),
  value: z.string(),
  valueType: z.string().optional(),
});

const ConditionalBranchNodeV4Data = z.object({
  conditions: z.array(ConditionalBranchConditionV4Schema),
});

const ConditionalBranchNodeV5EvalData = z.object({
  evaluatedConditionId: z.string(),
});

const SendMessageNodeV1Data = z.object({
  channelName: z.string(),
});

const SendMessageNodeV2Data = z.object({
  channelNames: z.array(z.string()),
});

const CreateCategoryNodeV1Data = z.object({
  categoryName: z.string(),
});

// v9: 既存レコードへ空の scenarioData を書き込む。旧 flowData からの変換は行わない
// (docs: scenario-editor-architecture D4)。空の形は v9 時点のリテラルで持つ
// (defaultScenarioData を import すると、将来スキーマが変わったときに過去の
// マイグレーションの意味が変わる)。
export const applyScenarioDataMigration = async (tx: Transaction): Promise<void> => {
  const emptyScenarioData = JSON.stringify({ version: 1, blocks: [] });
  const backfill = (row: { scenarioData?: string }): void => {
    row.scenarioData ??= emptyScenarioData;
  };

  await tx.table("Template").toCollection().modify(backfill);
  await tx.table("GameSession").toCollection().modify(backfill);
};

// v10: scenarioData を v1 (ブロック列) から v2 (doc + steps) へ移す
// (docs: scenario-editor-architecture D26)。旧 flowData と違い同じ道具の中の表現形式の
// 変更なので 1 対 1 に写せる。変換ロジックは画面側と共有する (二重実装するとドリフトする)。
export const applyScenarioDataV2Migration = async (tx: Transaction): Promise<void> => {
  const migrate = (scenarioData: string): string => {
    try {
      return JSON.stringify(toScenarioDataV2(JSON.parse(scenarioData)));
    } catch {
      // 壊れた JSON はそのまま残す。読み出し側 (getParsedScenarioData) が空へ落とす。
      return scenarioData;
    }
  };
  const upgrade = (row: { scenarioData?: string }): void => {
    if (row.scenarioData !== undefined) row.scenarioData = migrate(row.scenarioData);
  };

  await tx.table("Template").toCollection().modify(upgrade);
  await tx.table("GameSession").toCollection().modify(upgrade);
};

export class DB extends Dexie {
  DiscordBot!: Table<DiscordBotData, string>;
  GameSession!: EntityTable<GameSessionData, "id">;
  Guild!: Table<GuildData, string>;
  Category!: Table<CategoryData, string>;
  Channel!: Table<ChannelData, string>;
  Role!: Table<RoleData, [string, string]>; // Composite key: [id, guildId]
  Template!: EntityTable<TemplateData, "id">;

  constructor() {
    super("GmAssistant");

    this.version(1).stores({
      DiscordBot: "id, name, token, icon",
      GameSession: "++id, name, guildId, botId, gameFlags, reactFlowData, createdAt, lastUsedAt",
      Guild: "id, name, icon",
      Category: "id, sessionId, name",
      Channel: "id, sessionId, name, type, *writerRoleIds, *readerRoleIds",
      Role: "[id+guildId], sessionId, name",
      Template: "++id, name, gameFlags, reactFlowData, createdAt, updatedAt",
    });

    this.version(2).upgrade(async (tx) => {
      const migrateReactFlowData = (reactFlowDataStr: string): string => {
        let parsed: z.infer<typeof ReactFlowDataMigrationSchema>;
        try {
          parsed = ReactFlowDataMigrationSchema.parse(JSON.parse(reactFlowDataStr));
        } catch {
          return reactFlowDataStr;
        }

        let modified = false;
        for (const node of parsed.nodes) {
          if (node.type === "SendMessage" && node.data) {
            const v1 = SendMessageNodeV1Data.safeParse(node.data);
            if (v1.success) {
              const name = v1.data.channelName;
              node.data.channelNames = name.trim() === "" ? [""] : [name];
              delete node.data.channelName;
              modified = true;
            }
          }

          if (node.type === "CreateCategory" && node.data) {
            const v1 = CreateCategoryNodeV1Data.safeParse(node.data);
            if (v1.success) {
              node.data.categoryName = {
                type: "literal",
                value: v1.data.categoryName,
              };
              modified = true;
            }
          }
        }

        return modified ? JSON.stringify(parsed) : reactFlowDataStr;
      };

      await tx
        .table("Template")
        .toCollection()
        .modify((template) => {
          template.reactFlowData = migrateReactFlowData(template.reactFlowData);
        });

      await tx
        .table("GameSession")
        .toCollection()
        .modify((session) => {
          session.reactFlowData = migrateReactFlowData(session.reactFlowData);
        });
    });

    this.version(3).upgrade(async (tx) => {
      const migrateReactFlowData = (reactFlowDataStr: string): string => {
        let parsed: z.infer<typeof ReactFlowDataMigrationSchema>;
        try {
          parsed = ReactFlowDataMigrationSchema.parse(JSON.parse(reactFlowDataStr));
        } catch {
          return reactFlowDataStr;
        }

        let modified = false;
        for (const node of parsed.nodes) {
          if (node.type === "SendMessage" && node.data) {
            const v2 = SendMessageNodeV2Data.safeParse(node.data);
            if (v2.success) {
              node.data.channelTargets = v2.data.channelNames.map((name) => ({
                type: "channelName",
                value: name,
              }));
              delete node.data.channelNames;
              modified = true;
            }
          }
        }

        return modified ? JSON.stringify(parsed) : reactFlowDataStr;
      };

      await tx
        .table("Template")
        .toCollection()
        .modify((template) => {
          template.reactFlowData = migrateReactFlowData(template.reactFlowData);
        });

      await tx
        .table("GameSession")
        .toCollection()
        .modify((session) => {
          session.reactFlowData = migrateReactFlowData(session.reactFlowData);
        });
    });

    this.version(5).upgrade(async (tx) => {
      const migrateReactFlowData = (reactFlowDataStr: string): string => {
        let parsed: z.infer<typeof ReactFlowDataMigrationSchema>;
        try {
          parsed = ReactFlowDataMigrationSchema.parse(JSON.parse(reactFlowDataStr));
        } catch {
          return reactFlowDataStr;
        }

        let modified = false;
        for (const node of parsed.nodes) {
          if (node.type === "ConditionalBranch" && node.data) {
            const v4 = ConditionalBranchNodeV4Data.safeParse(node.data);
            if (v4.success) {
              node.data.conditions = v4.data.conditions.map((c) => ({
                id: c.id,
                root: {
                  type: "rule",
                  id: c.id,
                  flagKey: c.flagKey,
                  operator: c.operator,
                  value: c.value,
                  valueType: c.valueType ?? "literal",
                },
              }));
              modified = true;
            }
          }
        }

        return modified ? JSON.stringify(parsed) : reactFlowDataStr;
      };

      await tx
        .table("Template")
        .toCollection()
        .modify((template) => {
          template.reactFlowData = migrateReactFlowData(template.reactFlowData);
        });

      await tx
        .table("GameSession")
        .toCollection()
        .modify((session) => {
          session.reactFlowData = migrateReactFlowData(session.reactFlowData);
        });
    });

    this.version(6).upgrade(async (tx) => {
      const migrateReactFlowData = (reactFlowDataStr: string): string => {
        let parsed: z.infer<typeof ReactFlowDataMigrationSchema>;
        try {
          parsed = ReactFlowDataMigrationSchema.parse(JSON.parse(reactFlowDataStr));
        } catch {
          return reactFlowDataStr;
        }

        let modified = false;
        for (const node of parsed.nodes) {
          if (node.type === "ConditionalBranch" && node.data) {
            const v5 = ConditionalBranchNodeV5EvalData.safeParse(node.data);
            if (v5.success) {
              // "default" sentinel → empty array (no condition matched, default branch used)
              node.data.evaluatedConditionIds =
                v5.data.evaluatedConditionId === "default" ? [] : [v5.data.evaluatedConditionId];
              delete node.data.evaluatedConditionId;
              modified = true;
            }
          }
        }

        return modified ? JSON.stringify(parsed) : reactFlowDataStr;
      };

      await tx
        .table("Template")
        .toCollection()
        .modify((template) => {
          template.reactFlowData = migrateReactFlowData(template.reactFlowData);
        });

      await tx
        .table("GameSession")
        .toCollection()
        .modify((session) => {
          session.reactFlowData = migrateReactFlowData(session.reactFlowData);
        });
    });

    this.version(4).upgrade(async (tx) => {
      const migrateReactFlowData = (reactFlowDataStr: string): string => {
        let parsed: z.infer<typeof ReactFlowDataMigrationSchema>;
        try {
          parsed = ReactFlowDataMigrationSchema.parse(JSON.parse(reactFlowDataStr));
        } catch {
          return reactFlowDataStr;
        }

        let modified = false;
        for (const node of parsed.nodes) {
          if (node.type === "ConditionalBranch" && node.data) {
            const v3 = ConditionalBranchNodeV3Data.safeParse(node.data);
            if (v3.success) {
              node.data.conditions = v3.data.conditions.map((c) => ({
                ...c,
                valueType: "literal",
              }));
              modified = true;
            }
          }
        }

        return modified ? JSON.stringify(parsed) : reactFlowDataStr;
      };

      await tx
        .table("Template")
        .toCollection()
        .modify((template) => {
          template.reactFlowData = migrateReactFlowData(template.reactFlowData);
        });

      await tx
        .table("GameSession")
        .toCollection()
        .modify((session) => {
          session.reactFlowData = migrateReactFlowData(session.reactFlowData);
        });
    });

    // issue #182 Phase 1: ステップリスト型エディタ用の flowData を追加。既存の
    // reactFlowData を best-effort 変換して両テーブルへ付与する。reactFlowData は
    // 旧 UI + バックアップとして保持する (削除しない)。
    this.version(7)
      .stores({
        GameSession:
          "++id, name, guildId, botId, gameFlags, reactFlowData, flowData, createdAt, lastUsedAt",
        Template: "++id, name, gameFlags, reactFlowData, flowData, createdAt, updatedAt",
      })
      .upgrade(applyFlowDataMigration);

    // issue #244: テンプレートのメタ情報カラム。すべて optional 追加のためデータ変換は不要で、
    // 範囲での絞り込みに使う人数・所要時間にインデックスを張るためだけのバージョン。
    // coverPath は絞り込みに使わないのでインデックスなし (カラムとしては保存される)。
    this.version(8).stores({
      Template:
        "++id, name, gameFlags, reactFlowData, flowData, createdAt, updatedAt, system, playerCountMin, playerCountMax, durationMinutesMin, durationMinutesMax",
    });

    // issue #245: シナリオドキュメント型 UI の scenarioData を両テーブルへ追加する。
    // 絞り込みには使わないため (有無の判定は行を読んでから行う) インデックスは張らない。
    this.version(9).upgrade(applyScenarioDataMigration);

    // issue #213: 本文をブロック列から段落ベースのリッチテキストへ改める
    // (docs: scenario-editor-architecture D1 / D26)。インデックスは張らないので
    // stores() の変更はなく、既存行の scenarioData を読み替えるだけ。
    this.version(10).upgrade(applyScenarioDataV2Migration);
  }
}
