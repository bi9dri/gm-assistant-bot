import type { Step } from "@/flow/schema";

// シナリオ本文を外部 (主にココフォリア) へ持ち出す / 外部から流し込む経路の純粋部分
// (docs: scenario-editor-architecture D13 / D19)。

// コピー対象のテキスト。持たないブロックは空文字を返し、呼び出し側がボタンを出さない。
export const blockCopyText = (block: Step): string => {
  if (block.type === "Text") return block.body;
  // ココフォリアへは 1 メッセージずつ貼るより、まとめて持ち出せるほうが手数が少ない。
  if (block.type === "SendMessage")
    return block.messages.map((message) => message.content).join("\n\n");
  return "";
};

// 空行区切りで本文ブロックに割る。Markdown パーサは持たない (D6 / D19)。
export const splitTextBlocks = (text: string): string[] =>
  text
    // Windows / 旧 Mac 由来の改行でも空行区切りが成立するように正規化する。
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");

export const isImportableTextFile = (file: File): boolean => /\.(txt|md)$/i.test(file.name);
