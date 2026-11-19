import Dexie from "dexie";
import { afterEach, describe, expect, test } from "vite-plus/test";

import { db as appDb } from "./instance";

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

  test("本体の Template スキーマが V8_STORES と一致している", () => {
    const actual = appDb.Template.schema.indexes.map((index) => index.name).sort();
    const expected = V8_STORES.Template.split(",")
      .slice(1)
      .map((name) => name.trim())
      .sort();
    expect(actual).toEqual(expected);
  });
});
