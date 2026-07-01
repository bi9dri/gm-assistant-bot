import type { TemplateResources } from "@/components/Node/utils/collectResources";

import type { FlowData, Step } from "./schema";

// FlowData ツリーから、フィールドエディタ (ResourceSelector / FlagValueSelector /
// DynamicValueInput) が候補表示に使う TemplateResources を集める。
// React Flow 版の collectResourcesBeforeNode の flowData 版。edit モードでは順序を厳密に
// 追わず (engine 不在)、ツリー全体を走査する。sourceNodeId には step.id を入れる。
const collectFromStep = (step: Step, resources: TemplateResources): void => {
  switch (step.type) {
    case "CreateRole":
      for (const roleName of step.roles) {
        const name = roleName.trim();
        if (name) resources.roles.push({ name, sourceNodeId: step.id });
      }
      break;
    case "CreateChannel":
      for (const channel of step.channels) {
        const name = channel.name.trim();
        if (name) resources.channels.push({ name, type: channel.type, sourceNodeId: step.id });
      }
      break;
    case "SetGameFlag": {
      const key = step.flagKey.trim();
      const value = step.flagValue.trim();
      if (key)
        resources.gameFlags.push({ key, values: value ? [value] : [], sourceNodeId: step.id });
      break;
    }
    case "Counter": {
      const key = step.flagKey.trim();
      if (key) resources.gameFlags.push({ key, values: [], sourceNodeId: step.id });
      break;
    }
    case "RandomSelect": {
      const key = step.resultFlagKey.trim();
      if (key) {
        const values = step.items.map((item) => item.trim()).filter((item) => item !== "");
        resources.gameFlags.push({ key, values, sourceNodeId: step.id });
      }
      break;
    }
    case "ShuffleAssign": {
      const prefix = step.resultFlagPrefix.trim();
      if (prefix) {
        const values = step.items.map((item) => item.trim()).filter((item) => item !== "");
        for (const target of step.targets) {
          const t = target.trim();
          if (t) resources.gameFlags.push({ key: `${prefix}_${t}`, values, sourceNodeId: step.id });
        }
      }
      break;
    }
    case "Branch": {
      if (step.mode === "select") {
        const key = step.flagName.trim();
        if (key) {
          const values = step.branches
            .map((arm) => arm.label)
            .filter((label) => label.trim() !== "");
          resources.gameFlags.push({ key, values, sourceNodeId: step.id });
        }
      }
      for (const arm of step.branches) {
        for (const child of arm.steps) collectFromStep(child, resources);
      }
      break;
    }
    default:
      break;
  }
};

export const collectResourcesFromFlow = (flow: FlowData): TemplateResources => {
  const resources: TemplateResources = { roles: [], channels: [], gameFlags: [] };
  for (const section of flow.sections) {
    for (const step of section.steps) collectFromStep(step, resources);
  }
  return resources;
};
