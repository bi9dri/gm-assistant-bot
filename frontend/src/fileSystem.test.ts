import { describe, test, expect, beforeEach, mock } from "bun:test";

import { FileSystem } from "./fileSystem";

// 実際のファイルストレージを持つ拡張OPFSモック
class MockFileSystemStorage {
  private files = new Map<string, Blob>();
  private directories = new Set<string>();

  constructor() {
    this.directories.add("/");
  }

  reset() {
    this.files.clear();
    this.directories.clear();
    this.directories.add("/");
  }

  writeFile(path: string, data: Blob | string) {
    const blob = data instanceof Blob ? data : new Blob([data]);
    this.files.set(path, blob);

    // 親ディレクトリが存在することを確認
    const parts = path.split("/").filter(Boolean);
    let current = "";
    for (let i = 0; i < parts.length - 1; i++) {
      current += `/${parts[i]}`;
      this.directories.add(current);
    }
  }

  readFile(path: string): Blob | undefined {
    return this.files.get(path);
  }

  deleteFile(path: string) {
    this.files.delete(path);
  }

  fileExists(path: string): boolean {
    return this.files.has(path);
  }

  createDirectory(path: string) {
    this.directories.add(path);
  }

  directoryExists(path: string): boolean {
    return this.directories.has(path);
  }

  getFilesInDirectory(dirPath: string): string[] {
    const prefix = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
    const files: string[] = [];
    for (const path of this.files.keys()) {
      if (path.startsWith(prefix)) {
        files.push(path);
      }
    }
    return files;
  }
}

const mockStorage = new MockFileSystemStorage();

// モックファイルシステムハンドルを作成
const createMockDirectoryHandle = (path: string): FileSystemDirectoryHandle => {
  const name = path.split("/").filter(Boolean).pop() || "root";

  return {
    kind: "directory",
    name,
    isSameEntry: mock(async () => false),
    queryPermission: mock(async () => "granted" as PermissionState),
    requestPermission: mock(async () => "granted" as PermissionState),
    getDirectoryHandle: mock(async (dirName: string, options?: { create?: boolean }) => {
      const newPath = `${path}/${dirName}`;
      if (options?.create) {
        mockStorage.createDirectory(newPath);
      }
      if (!mockStorage.directoryExists(newPath) && !options?.create) {
        const error = new DOMException("Directory not found", "NotFoundError");
        throw error;
      }
      return createMockDirectoryHandle(newPath);
    }),
    getFileHandle: mock(async (fileName: string, options?: { create?: boolean }) => {
      const filePath = `${path}/${fileName}`;
      if (!mockStorage.fileExists(filePath) && !options?.create) {
        const error = new DOMException("File not found", "NotFoundError");
        throw error;
      }
      return createMockFileHandle(filePath);
    }),
    removeEntry: mock(async (name: string) => {
      const entryPath = `${path}/${name}`;
      mockStorage.deleteFile(entryPath);
      // サブディレクトリ内のファイルも削除
      for (const filePath of mockStorage.getFilesInDirectory(entryPath)) {
        mockStorage.deleteFile(filePath);
      }
    }),
    resolve: mock(async (_handle: FileSystemHandle) => {
      // このディレクトリからの相対パスセグメントを返す
      return [name];
    }),
    keys: mock(async function* () {}),
    values: mock(async function* () {
      const files = mockStorage.getFilesInDirectory(path);
      for (const filePath of files) {
        const fileName = filePath.slice(path.length + 1).split("/")[0];
        yield createMockFileHandle(`${path}/${fileName}`);
      }
    }),
    entries: mock(async function* () {}),
    [Symbol.asyncIterator]: mock(async function* () {}),
  } as unknown as FileSystemDirectoryHandle;
};

const createMockFileHandle = (path: string): FileSystemFileHandle => {
  const name = path.split("/").filter(Boolean).pop() || "";

  return {
    kind: "file",
    name,
    isSameEntry: mock(async () => false),
    queryPermission: mock(async () => "granted" as PermissionState),
    requestPermission: mock(async () => "granted" as PermissionState),
    getFile: mock(async () => {
      const blob = mockStorage.readFile(path);
      if (!blob) {
        return new Blob();
      }
      return new File([blob], name);
    }),
    createWritable: mock(async () => ({
      write: mock(async (data: Blob | string) => {
        mockStorage.writeFile(path, data);
      }),
      seek: mock(async () => {}),
      truncate: mock(async () => {}),
      close: mock(async () => {}),
      abort: mock(async () => {}),
      locked: false,
      getWriter: mock(() => ({})),
    })),
  } as unknown as FileSystemFileHandle;
};

// navigator.storage.getDirectoryモックをオーバーライド
Object.defineProperty(globalThis, "navigator", {
  value: {
    storage: {
      getDirectory: mock(async () => createMockDirectoryHandle("")),
    },
  },
  writable: true,
  configurable: true,
});

describe("FileSystem", () => {
  let fs: FileSystem;

  beforeEach(() => {
    mockStorage.reset();
    fs = new FileSystem();
    // Tables are cleared in test/unit.setup.ts afterEach
  });

  describe("constructor", () => {
    test("File System APIが利用できない場合はエラーをスローする", () => {
      const originalNavigator = globalThis.navigator;

      Object.defineProperty(globalThis, "navigator", {
        value: { storage: undefined },
        writable: true,
        configurable: true,
      });

      expect(() => new FileSystem()).toThrow("ブラウザのファイルシステムを利用できません");

      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("writeFile / readFile", () => {
    test("同じ内容でファイルを書き込みと読み込みができる", async () => {
      const content = "Hello, World!";
      await fs.writeFile("/test/file.txt", content);

      const file = await fs.readFile("/test/file.txt");
      const text = await file.text();

      expect(text).toBe(content);
    });

    test("Blobデータを書き込みと読み込みができる", async () => {
      const blob = new Blob(["Binary data"], { type: "application/octet-stream" });
      await fs.writeFile("/data.bin", blob);

      const file = await fs.readFile("/data.bin");

      expect(await file.text()).toBe("Binary data");
    });

    test("ネストされたパスを処理できる", async () => {
      await fs.writeFile("/template/1/data.json", '{"key": "value"}');

      const file = await fs.readFile("/template/1/data.json");
      const text = await file.text();

      expect(text).toBe('{"key": "value"}');
    });
  });

  describe("deleteFile", () => {
    test("既存のファイルを削除する", async () => {
      await fs.writeFile("/to-delete.txt", "content");
      expect(await fs.fileExists("/to-delete.txt")).toBe(true);

      await fs.deleteFile("/to-delete.txt");

      expect(await fs.fileExists("/to-delete.txt")).toBe(false);
    });
  });

  describe("fileExists", () => {
    test("既存のファイルに対してtrueを返す", async () => {
      await fs.writeFile("/exists.txt", "content");

      expect(await fs.fileExists("/exists.txt")).toBe(true);
    });

    test("存在しないファイルに対してfalseを返す", async () => {
      expect(await fs.fileExists("/does-not-exist.txt")).toBe(false);
    });
  });

  describe("clearTemplateFiles", () => {
    test("指定されたtemplateIdのテンプレートファイルをクリアする", async () => {
      await fs.writeFile("/template/1/file1.txt", "content1");
      await fs.writeFile("/template/1/file2.txt", "content2");

      await fs.clearTemplateFiles(1);

      expect(await fs.fileExists("/template/1/file1.txt")).toBe(false);
      expect(await fs.fileExists("/template/1/file2.txt")).toBe(false);
    });

    test("テンプレートディレクトリが存在しない場合はエラーをスローしない", async () => {
      expect(fs.clearTemplateFiles(999)).resolves.toBeUndefined();
    });
  });

  describe("clearSessionFiles", () => {
    test("指定されたsessionIdのセッションファイルをクリアする", async () => {
      await fs.writeFile("/session/1/file1.txt", "content1");

      await fs.clearSessionFiles(1);

      expect(await fs.fileExists("/session/1/file1.txt")).toBe(false);
    });

    test("セッションディレクトリが存在しない場合はエラーをスローしない", async () => {
      expect(fs.clearSessionFiles(999)).resolves.toBeUndefined();
    });
  });

  describe("exportTemplate", () => {
    // ZIPエクスポートは複雑でOPFSウォーキングの適切なモックが必要
    // これらのテストはe2eテストに適している

    test("テンプレートが見つからない場合はエラーをスローする", async () => {
      expect(fs.exportTemplate(999)).rejects.toThrow("テンプレートが見つかりません");
    });
  });
});
