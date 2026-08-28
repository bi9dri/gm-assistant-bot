import { afterEach, describe, expect, test } from "bun:test";

import Dexie from "dexie";

// version(8) はメタ情報カラム (issue #244) のインデックス追加のみで upgrade 関数を持たない。
// 「既存レコードが壊れず、新カラムはインデックス経由で絞り込める」ことを実 IndexedDB
// (fake-indexeddb) 上で確認する。配線は test/unit.setup.ts の db import で済んでいる前提。

const DB_NAME = "TemplateMetaMigrationTest";

const V7_STORES = {
  Template: "++id, name, gameFlags, reactFlowData, flowData, createdAt, updatedAt",
};

const V8_STORES = {
  Template:
    "++id, name, gameFlags, reactFlowData, flowData, createdAt, updatedAt, system, playerCountMin, playerCountMax, durationMinutesMin, durationMinutesMax",
};

const emptyFlow = JSON.stringify({ version: 1, sections: [] });
const emptyReactFlow = JSON.stringify({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

afterEach(async () => {
  await Dexie.delete(DB_NAME);
});

describe("template meta migration (v7 → v8)", () => {
  test("既存レコードは維持され、メタ情報は未設定のまま読める", async () => {
    const oldDb = new Dexie(DB_NAME);
    oldDb.version(7).stores(V7_STORES);
    await oldDb.open();

    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const id = await oldDb.table("Template").add({
      name: "既存テンプレート",
      gameFlags: "{}",
      reactFlowData: emptyReactFlow,
      flowData: emptyFlow,
      createdAt,
      updatedAt: createdAt,
    });
    oldDb.close();

    const newDb = new Dexie(DB_NAME);
    newDb.version(7).stores(V7_STORES);
    newDb.version(8).stores(V8_STORES);
    await newDb.open();

    const row = await newDb.table("Template").get(id);
    expect(row).toMatchObject({
      name: "既存テンプレート",
      gameFlags: "{}",
      reactFlowData: emptyReactFlow,
      flowData: emptyFlow,
      createdAt,
    });
    expect(row.playerCountMin).toBeUndefined();
    expect(row.system).toBeUndefined();

    newDb.close();
  });

  test("メタ情報カラムでインデックス検索できる", async () => {
    const db = new Dexie(DB_NAME);
    db.version(7).stores(V7_STORES);
    db.version(8).stores(V8_STORES);
    await db.open();

    const base = {
      gameFlags: "{}",
      reactFlowData: emptyReactFlow,
      flowData: emptyFlow,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.table("Template").bulkAdd([
      { ...base, name: "メタあり", system: "CoC", playerCountMin: 2, playerCountMax: 4 },
      { ...base, name: "メタなし" },
    ]);

    const withSystem = await db.table("Template").where("system").equals("CoC").toArray();
    expect(withSystem.map((t) => t.name)).toEqual(["メタあり"]);

    // 未設定のレコードはインデックスに載らない = 絞り込みで自然に除外される
    const upTo4 = await db.table("Template").where("playerCountMax").belowOrEqual(4).toArray();
    expect(upTo4.map((t) => t.name)).toEqual(["メタあり"]);

    db.close();
  });
});
