import { afterEach, vi } from "vite-plus/test";

import { db } from "../src/db/instance";

afterEach(async () => {
  await db.Template.clear();
  await db.GameSession.clear();
  await db.DiscordBot.clear();
  await db.Guild.clear();
  await db.Category.clear();
  await db.Channel.clear();
  await db.Role.clear();
});

const mockFileSystem = new Map<string, Blob>();

const createMockDirectoryHandle = (name: string): FileSystemDirectoryHandle =>
  ({
    kind: "directory",
    name,
    getDirectoryHandle: vi.fn(async (dirName: string, _options?: { create?: boolean }) => {
      return createMockDirectoryHandle(dirName);
    }),
    getFileHandle: vi.fn(async (fileName: string, _options?: { create?: boolean }) => {
      return createMockFileHandle(fileName);
    }),
    removeEntry: vi.fn(async () => {}),
    resolve: vi.fn(async () => [name]),
    values: vi.fn(async function* () {}),
  }) as unknown as FileSystemDirectoryHandle;

const createMockFileHandle = (name: string): FileSystemFileHandle =>
  ({
    kind: "file",
    name,
    getFile: vi.fn(async () => mockFileSystem.get(name) ?? new Blob()),
    createWritable: vi.fn(async () => ({
      write: vi.fn(async (data: Blob | string) => {
        mockFileSystem.set(name, data instanceof Blob ? data : new Blob([data]));
      }),
      close: vi.fn(async () => {}),
    })),
  }) as unknown as FileSystemFileHandle;

Object.defineProperty(globalThis, "navigator", {
  value: {
    storage: {
      getDirectory: vi.fn(async () => createMockDirectoryHandle("root")),
    },
  },
  writable: true,
});
