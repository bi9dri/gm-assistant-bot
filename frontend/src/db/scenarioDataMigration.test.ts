import { afterEach, describe, expect, test } from "bun:test";

import Dexie from "dexie";

import { defaultScenarioData } from "@/scenario/schema";

import { applyScenarioDataMigration } from "./database";

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

// 本体と同じ upgrade 関数を張った v9。本体は 1 つの Dexie インスタンスに全バージョンを
// 積むため、ここでは v8 → v9 の差分だけを再現する。
const openV9 = async (): Promise<Dexie> => {
  const db = new Dexie(DB_NAME);
  db.version(8).stores(V8_STORES);
  db.version(9).upgrade(applyScenarioDataMigration);
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

    const db = await openV9();
    // 一度上がった DB に対してもう一度同じ関数を流す (再オープンでは upgrade が走らない)
    await db.transaction("rw", db.table("Template"), db.table("GameSession"), (tx) =>
      applyScenarioDataMigration(tx),
    );

    expect((await db.table("Template").get(id)).scenarioData).toBe(scenarioData);

    db.close();
  });
});
