import { convertFilePathsInSteps } from "@/flow/filePaths";

import type { ScenarioData } from "./schema";

export const convertFilePathsInScenarioData = (
  scenarioData: ScenarioData,
  replacer: (filePath: string) => string,
): ScenarioData => ({
  ...scenarioData,
  steps: convertFilePathsInSteps(scenarioData.steps, replacer),
});
