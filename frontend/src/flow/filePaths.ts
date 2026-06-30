import type { FlowData, Step } from "./schema";

// FlowData 内の添付ファイルパスを書き換える。reactFlowData 側の
// convertFilePathsInReactFlowData (fileSystem.ts) と対の関数で、セッション作成や
// テンプレートインポート時に template/{id}/ ↔ session/{id}/ ↔ files/ のパスを移し替える。
// SendMessage / CombinationSendMessage の attachments[].filePath を対象とし、Branch は
// branches[].steps へ再帰する。
export function convertFilePathsInFlowData(
  flowData: FlowData,
  replacer: (filePath: string) => string,
): FlowData {
  const convertStep = (step: Step): Step => {
    if (step.type === "SendMessage") {
      return {
        ...step,
        messages: step.messages.map((message) => ({
          ...message,
          attachments: message.attachments.map((a) => ({ ...a, filePath: replacer(a.filePath) })),
        })),
      };
    }
    if (step.type === "CombinationSendMessage") {
      return {
        ...step,
        entries: step.entries.map((entry) => ({
          ...entry,
          messages: entry.messages.map((message) => ({
            ...message,
            attachments: message.attachments.map((a) => ({ ...a, filePath: replacer(a.filePath) })),
          })),
        })),
      };
    }
    if (step.type === "Branch") {
      return {
        ...step,
        branches: step.branches.map((arm) => ({ ...arm, steps: arm.steps.map(convertStep) })),
      };
    }
    return step;
  };

  return {
    ...flowData,
    sections: flowData.sections.map((section) => ({
      ...section,
      steps: section.steps.map(convertStep),
    })),
  };
}
