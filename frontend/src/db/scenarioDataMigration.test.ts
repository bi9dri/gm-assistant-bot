import { afterEach, describe, expect, test } from "bun:test";

import Dexie from "dexie";

import { applyScenarioDataMigration, applyScenarioDataV2Migration } from "./database";

// version(9) は scenarioData カラムの追加、version(10) は本文の v1 → v2 変換。インデックスを張らないため stores は変わらず、
// 既存レコードへ空の scenarioData を書き込むだけの upgrade を実 IndexedDB 上で検証する。
// fake-indexeddb は test/unit.setup.ts で設定済み。

const DB_NAME = "ScenarioDataMigrationTest";

const V8_STORES = {
  Template:
    "++id, name, gameFlags, reactFlowData, flowData, createdAt, updatedAt, system, playerCountMin, playerCountMax, durationMinutesMin, durationMinutesMax",
  GameSession:
    "++id, name, guildId, botId, gameFlags, reactFlowData, flowData, createdAt, lastUsedAt",
};

// v9 が書き込む空の形。migration 側と同じくバージョン当時のリテラルで持つ
// (defaultScenarioData を参照すると、スキーマが進んだときに過去の期待値が変わる)。
const emptyScenarioDataV1 = JSON.stringify({ version: 1, blocks: [] });
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
      scenarioData: emptyScenarioDataV1,
    });
    expect(await newDb.table("GameSession").get(sessionId)).toMatchObject({
      name: "既存セッション",
      flowData: emptyFlow,
      scenarioData: emptyScenarioDataV1,
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

// version(10) は本文をブロック列から段落ベースのリッチテキストへ移す
// (docs: scenario-editor-architecture D26)。
const openV10 = async (): Promise<Dexie> => {
  const db = new Dexie(DB_NAME);
  db.version(8).stores(V8_STORES);
  db.version(9).upgrade(applyScenarioDataMigration);
  db.version(10).upgrade(applyScenarioDataV2Migration);
  await db.open();
  return db;
};

describe("scenarioData migration (v9 → v10)", () => {
  const v1ScenarioData = JSON.stringify({
    version: 1,
    blocks: [
      { id: "h1", type: "Heading", title: "導入", memo: "", autoAdvance: false, level: 1 },
      { id: "t1", type: "Text", title: "本文", memo: "", autoAdvance: false, body: "館に着いた。" },
      {
        id: "c1",
        type: "Counter",
        title: "周回",
        memo: "",
        autoAdvance: false,
        flagKey: "round",
        step: 1,
      },
    ],
  });

  const addTemplate = async (db: Dexie, scenarioData: string): Promise<number> =>
    (await db.table("Template").add({
      name: "旧形式テンプレート",
      gameFlags: "{}",
      reactFlowData: emptyReactFlow,
      flowData: emptyFlow,
      scenarioData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

  test("ブロック列が doc + steps に移る", async () => {
    const oldDb = await openV8();
    const id = await addTemplate(oldDb, v1ScenarioData);
    oldDb.close();

    const db = await openV10();

    const migrated = JSON.parse((await db.table("Template").get(id)).scenarioData);
    expect(migrated.version).toBe(2);
    expect(migrated.doc.content.map((node: { type: string }) => node.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
    ]);
    // 本文と見出しは doc へ、Discord 操作の実体だけが steps に残る。
    expect(migrated.steps.map((step: { id: string }) => step.id)).toEqual(["c1"]);

    db.close();
  });

  test("再実行しても v2 のデータを壊さない (冪等)", async () => {
    const oldDb = await openV8();
    const id = await addTemplate(oldDb, v1ScenarioData);
    oldDb.close();

    const db = await openV10();
    const once = (await db.table("Template").get(id)).scenarioData;
    await db.transaction("rw", db.table("Template"), db.table("GameSession"), (tx) =>
      applyScenarioDataV2Migration(tx),
    );

    expect((await db.table("Template").get(id)).scenarioData).toBe(once);

    db.close();
  });

  test("壊れた JSON はそのまま残す", async () => {
    const oldDb = await openV8();
    const id = await addTemplate(oldDb, "not json");
    oldDb.close();

    const db = await openV10();

    expect((await db.table("Template").get(id)).scenarioData).toBe("not json");

    db.close();
  });
});
