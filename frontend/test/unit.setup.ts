import { afterEach, mock } from "bun:test";

import { db } from "../src/db/instance";

// Clear all tables after each test (instead of delete/recreate which causes issues)
afterEach(async () => {
  await db.Template.clear();
  await db.GameSession.clear();
  await db.DiscordBot.clear();
  await db.Guild.clear();
  await db.Category.clear();
  await db.Channel.clear();
  await db.Role.clear();
});

// OPFS (navigator.storage) mock
const mockFileSystem = new Map<string, Blob>();

const createMockDirectoryHandle = (name: string): FileSystemDirectoryHandle =>
  ({
    kind: "directory",
    name,
    getDirectoryHandle: mock(async (dirName: string, _options?: { create?: boolean }) => {
      return createMockDirectoryHandle(dirName);
    }),
    getFileHandle: mock(async (fileName: string, _options?: { create?: boolean }) => {
      return createMockFileHandle(fileName);
    }),
    removeEntry: mock(async () => {}),
    resolve: mock(async () => [name]),
    values: mock(async function* () {}),
  }) as unknown as FileSystemDirectoryHandle;

const createMockFileHandle = (name: string): FileSystemFileHandle =>
  ({
    kind: "file",
    name,
    getFile: mock(async () => mockFileSystem.get(name) ?? new Blob()),
    createWritable: mock(async () => ({
      write: mock(async (data: Blob | string) => {
        mockFileSystem.set(name, data instanceof Blob ? data : new Blob([data]));
      }),
      close: mock(async () => {}),
    })),
  }) as unknown as FileSystemFileHandle;

// Mock navigator.storage.getDirectory
Object.defineProperty(globalThis, "navigator", {
  value: {
    storage: {
      getDirectory: mock(async () => createMockDirectoryHandle("root")),
    },
  },
  writable: true,
});
