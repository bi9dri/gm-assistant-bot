import type { FlowData, Step } from "./schema";

export function convertFilePathsInSteps(
  steps: Step[],
  replacer: (filePath: string) => string,
): Step[] {
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
        branches: step.branches.map((arm) => ({
          ...arm,
          steps: convertFilePathsInSteps(arm.steps, replacer),
        })),
      };
    }
    return step;
  };

  return steps.map(convertStep);
}

export function convertFilePathsInFlowData(
  flowData: FlowData,
  replacer: (filePath: string) => string,
): FlowData {
  return {
    ...flowData,
    sections: flowData.sections.map((section) => ({
      ...section,
      steps: convertFilePathsInSteps(section.steps, replacer),
    })),
  };
}
