import { afterEach, describe, expect, test } from "bun:test";
import Dexie from "dexie";

import { applyFlowDataMigration } from "@/flow/migrate";
import { FlowDataSchema } from "@/flow/schema";

// version(7) の flowData マイグレーションを実 IndexedDB (fake-indexeddb) 上で検証する。
// 純粋ロジックは migrate.test.ts が網羅するので、ここは「v6 → v7 の upgrade が両テーブルへ
// 適用され、legacy は変換・already-new は保持・reactFlowData は維持される」ことを確認する。
// fake-indexeddb の配線は test/unit.setup.ts の db import で済んでいる前提。

const DB_NAME = "FlowDataMigrationTest";

const V6_STORES = {
  Template: "++id, name, gameFlags, reactFlowData, createdAt, updatedAt",
  GameSession: "++id, name, guildId, botId, gameFlags, reactFlowData, createdAt, lastUsedAt",
};

const V7_STORES = {
  Template: "++id, name, gameFlags, reactFlowData, flowData, createdAt, updatedAt",
  GameSession:
    "++id, name, guildId, botId, gameFlags, reactFlowData, flowData, createdAt, lastUsedAt",
};

const legacyReactFlow = JSON.stringify({
  nodes: [
    {
      id: "n1",
      type: "SetGameFlag",
      position: { x: 0, y: 0 },
      data: { title: "開始", flagKey: "k", flagValue: "v" },
    },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

const existingFlow = JSON.stringify({
  version: 1,
  sections: [{ id: "kept", title: "既存", memo: "", collapsed: false, steps: [] }],
});

afterEach(async () => {
  await Dexie.delete(DB_NAME);
});

describe("flowData migration (v6 → v7)", () => {
  test("両テーブルの legacy を変換し、already-new を保持し、reactFlowData を維持する", async () => {
    // --- v6 でレコードを投入 ---
    const oldDb = new Dexie(DB_NAME);
    oldDb.version(6).stores(V6_STORES);
    await oldDb.open();

    const now = new Date();
    const tplLegacyId = await oldDb.table("Template").add({
      name: "t-legacy",
      gameFlags: "{}",
      reactFlowData: legacyReactFlow,
      createdAt: now,
      updatedAt: now,
    });
    const tplNewId = await oldDb.table("Template").add({
      name: "t-new",
      gameFlags: "{}",
      reactFlowData: legacyReactFlow,
      flowData: existingFlow,
      createdAt: now,
      updatedAt: now,
    });
    const sesLegacyId = await oldDb.table("GameSession").add({
      name: "s-legacy",
      guildId: "g",
      botId: "b",
      gameFlags: "{}",
      reactFlowData: legacyReactFlow,
      createdAt: now,
      lastUsedAt: now,
    });
    const sesNewId = await oldDb.table("GameSession").add({
      name: "s-new",
      guildId: "g",
      botId: "b",
      gameFlags: "{}",
      reactFlowData: legacyReactFlow,
      flowData: existingFlow,
      createdAt: now,
      lastUsedAt: now,
    });
    oldDb.close();

    // --- v7 で開く → upgrade が走る ---
    const newDb = new Dexie(DB_NAME);
    newDb.version(6).stores(V6_STORES);
    newDb.version(7).stores(V7_STORES).upgrade(applyFlowDataMigration);
    await newDb.open();

    const tplLegacy = await newDb.table("Template").get(tplLegacyId);
    const tplNew = await newDb.table("Template").get(tplNewId);
    const sesLegacy = await newDb.table("GameSession").get(sesLegacyId);
    const sesNew = await newDb.table("GameSession").get(sesNewId);
    newDb.close();

    // legacy: flowData が変換生成され、reactFlowData は保持される (両テーブル)
    for (const record of [tplLegacy, sesLegacy]) {
      expect(record.reactFlowData).toBe(legacyReactFlow);
      const parsed = FlowDataSchema.parse(JSON.parse(record.flowData));
      expect(parsed.sections.length).toBeGreaterThan(0);
      expect(parsed.sections[0].steps[0].title).toBe("開始");
    }

    // already-new: 既存の flowData がそのまま保持される (両テーブル)
    for (const record of [tplNew, sesNew]) {
      expect(record.flowData).toBe(existingFlow);
      expect(record.reactFlowData).toBe(legacyReactFlow);
    }
  });
});
