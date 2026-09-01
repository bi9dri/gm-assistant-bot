import type { Step } from "@/flow/schema";

// シナリオ本文を外部 (主にココフォリア) へ持ち出す / 外部から流し込む経路の純粋部分
// (docs: scenario-editor-architecture D13 / D19)。

const MESSAGE_SEPARATOR = "\n\n";

// コピー対象のテキスト。持たないステップは空文字を返し、呼び出し側がボタンを出さない。
export const stepCopyText = (step: Step): string => {
  if (step.type === "Text") return step.body;
  // ココフォリアへは 1 メッセージずつ貼るより、まとめて持ち出せるほうが手数が少ない。
  if (step.type === "SendMessage")
    return step.messages.map((message) => message.content).join(MESSAGE_SEPARATOR);
  if (step.type === "CombinationSendMessage")
    return step.entries
      .flatMap((entry) => entry.messages)
      .map((message) => message.content)
      .join(MESSAGE_SEPARATOR);
  return "";
};

// 空行区切りで段落に割る。Markdown パーサは持たない (D6 / D19)。
export const splitParagraphs = (text: string): string[] =>
  text
    // Windows / 旧 Mac 由来の改行でも空行区切りが成立するように正規化する。
    .replace(/\r\n?/g, "\n")
    // 全角スペースやタブだけの行も区切りとして扱う。ワープロ由来の .txt では
    // 「空行」がこの形になっていることがあり、そのままだと全体が 1 段落になる。
    .replace(/^[\t\u3000 ]+$/gm, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");

export const isImportableTextFile = (file: File): boolean => /\.(txt|md)$/i.test(file.name);
