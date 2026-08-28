import { afterEach, describe, expect, test } from "bun:test";

import Dexie from "dexie";

import { defaultScenarioData } from "@/scenario/schema";

// version(9) は scenarioData カラムの追加。インデックスを張らないため stores は変わらず、
// 既存レコードへ空の scenarioData を書き込むだけの upgrade を実 IndexedDB 上で検証する。
// fake-indexeddb は test/unit.setup.ts で設定済み。

const DB_NAME = "ScenarioDataMigrationTest";

const V8_STORES = {
  Template:
    "++id, name, gameFlags, reactFlowData, flowData, createdAt, updatedAt, system, playerCountMin, playerCountMax, durationMinutesMin, durationMinutesMax",
  GameSession:
    "++id, name, guildId, botId, gameFlags, reactFlowData, flowData, createdAt, lastUsedAt",
};

const emptyScenarioData = JSON.stringify(defaultScenarioData);
const emptyFlow = JSON.stringify({ version: 1, sections: [] });
const emptyReactFlow = JSON.stringify({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

const openV8 = async (): Promise<Dexie> => {
  const db = new Dexie(DB_NAME);
  db.version(8).stores(V8_STORES);
  await db.open();
  return db;
};

// 本体の database.ts と同じ upgrade を張った v9。本体は 1 つの Dexie インスタンスに
// 全バージョンを積むため、ここでは v8 → v9 の差分だけを再現する。
const openV9 = async (): Promise<Dexie> => {
  const db = new Dexie(DB_NAME);
  db.version(8).stores(V8_STORES);
  db.version(9).upgrade(async (tx) => {
    const backfill = (row: { scenarioData?: string }): void => {
      row.scenarioData ??= emptyScenarioData;
    };
    await tx.table("Template").toCollection().modify(backfill);
    await tx.table("GameSession").toCollection().modify(backfill);
  });
  await db.open();
  return db;
};

afterEach(async () => {
  await Dexie.delete(DB_NAME);
});

describe("scenarioData migration (v8 → v9)", () => {
  test("既存レコードは維持され、scenarioData が空で埋まる", async () => {
    const oldDb = await openV8();
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const templateId = await oldDb.table("Template").add({
      name: "既存テンプレート",
      gameFlags: "{}",
      reactFlowData: emptyReactFlow,
      flowData: emptyFlow,
      createdAt,
      updatedAt: createdAt,
    });
    const sessionId = await oldDb.table("GameSession").add({
      name: "既存セッション",
      guildId: "g1",
      botId: "b1",
      gameFlags: "{}",
      reactFlowData: emptyReactFlow,
      flowData: emptyFlow,
      createdAt,
      lastUsedAt: createdAt,
    });
    oldDb.close();

    const newDb = await openV9();

    expect(await newDb.table("Template").get(templateId)).toMatchObject({
      name: "既存テンプレート",
      flowData: emptyFlow,
      reactFlowData: emptyReactFlow,
      scenarioData: emptyScenarioData,
    });
    expect(await newDb.table("GameSession").get(sessionId)).toMatchObject({
      name: "既存セッション",
      flowData: emptyFlow,
      scenarioData: emptyScenarioData,
    });

    newDb.close();
  });

  test("再実行しても既存の scenarioData を上書きしない (冪等)", async () => {
    const oldDb = await openV8();
    const scenarioData = JSON.stringify({
      version: 1,
      blocks: [
        { id: "t1", type: "Text", title: "導入", memo: "", autoAdvance: false, body: "本文" },
      ],
    });
    const id = await oldDb.table("Template").add({
      name: "新形式テンプレート",
      gameFlags: "{}",
      reactFlowData: emptyReactFlow,
      flowData: emptyFlow,
      scenarioData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    oldDb.close();

    const migrated = await openV9();
    migrated.close();
    const reopened = await openV9();

    expect((await reopened.table("Template").get(id)).scenarioData).toBe(scenarioData);

    reopened.close();
  });

  test("本体の Template スキーマに scenarioData のインデックスを張っていない", async () => {
    const { db } = await import("./instance");

    expect(db.Template.schema.indexes.map((index) => index.name)).not.toContain("scenarioData");
    expect(db.GameSession.schema.indexes.map((index) => index.name)).not.toContain("scenarioData");
  });
});
