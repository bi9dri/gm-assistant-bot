import { beforeEach, describe, expect, it, mock } from "bun:test";

import { formatFileSize, saveFileToOPFS } from "./messageSchema";

const mockReadFile = mock(async (_path: string): Promise<File> => {
  throw new DOMException("Not found", "NotFoundError");
});
const mockWriteFile = mock(async (_path: string, _file: File): Promise<void> => {});

void mock.module("@/fileSystem", () => ({
  FileSystem: class {
    readFile = mockReadFile;
    writeFile = mockWriteFile;
  },
}));

const makeFile = (name: string, content: string): File =>
  new File([content], name, { type: "text/plain" });

beforeEach(() => {
  mockReadFile.mockReset();
  mockWriteFile.mockReset();
  mockReadFile.mockImplementation(async (_path: string): Promise<File> => {
    throw new DOMException("Not found", "NotFoundError");
  });
  mockWriteFile.mockImplementation(async (_path: string, _file: File): Promise<void> => {});
});

describe("saveFileToOPFS", () => {
  it("新規ファイル（templateId）はベースパスに保存される", async () => {
    const file = makeFile("image.png", "content");

    const result = await saveFileToOPFS(file, { templateId: 1 });

    expect(result).toBe("template/1/image.png");
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile.mock.calls[0][0]).toBe("template/1/image.png");
  });

  it("新規ファイル（sessionId）は session/ パスに保存される", async () => {
    const file = makeFile("audio.mp3", "data");

    const result = await saveFileToOPFS(file, { sessionId: 42 });

    expect(result).toBe("session/42/audio.mp3");
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile.mock.calls[0][0]).toBe("session/42/audio.mp3");
  });

  it("templateId も sessionId も未指定の場合はエラーをスローする", async () => {
    const file = makeFile("file.txt", "data");

    expect(saveFileToOPFS(file, {})).rejects.toThrow("templateIdまたはsessionIdが必要です");
  });

  it("同名・同内容のファイルは書き込みなしで既存パスを返す", async () => {
    const content = "identical content";
    const existingFile = makeFile("photo.jpg", content);
    const newFile = makeFile("photo.jpg", content);

    mockReadFile.mockImplementation(async (_path: string) => existingFile);

    const result = await saveFileToOPFS(newFile, { templateId: 5 });

    expect(result).toBe("template/5/photo.jpg");
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("同名・異内容のファイルはランダムサブディレクトリに保存される", async () => {
    const existingFile = makeFile("photo.jpg", "old content");
    const newFile = makeFile("photo.jpg", "new content");

    mockReadFile.mockImplementation(async (_path: string) => existingFile);

    const result = await saveFileToOPFS(newFile, { templateId: 5 });

    expect(result).toMatch(/^template\/5\/[0-9a-f]{8}\/photo\.jpg$/);
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile.mock.calls[0][0]).toBe(result);
  });
});

describe("formatFileSize", () => {
  it("1024 バイト未満は B 単位で表示する", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("1024 バイト以上 1MB 未満は KB 単位で表示する", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1024 * 1024 - 1)).toBe("1024.0 KB");
  });

  it("1MB 以上は MB 単位で表示する", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });
});
