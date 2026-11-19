import type { Step } from "@/flow/schema";

const MESSAGE_SEPARATOR = "\n\n";

export const stepCopyText = (step: Step): string => {
  if (step.type === "Text") return step.body;
  if (step.type === "SendMessage")
    return step.messages.map((message) => message.content).join(MESSAGE_SEPARATOR);
  if (step.type === "CombinationSendMessage")
    return step.entries
      .flatMap((entry) => entry.messages)
      .map((message) => message.content)
      .join(MESSAGE_SEPARATOR);
  return "";
};

export const splitParagraphs = (text: string): string[] =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/^[\t\u3000 ]+$/gm, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");

export const isImportableTextFile = (file: File): boolean => /\.(txt|md)$/i.test(file.name);
