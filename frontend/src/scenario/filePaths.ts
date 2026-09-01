import { convertFilePathsInSteps } from "@/flow/filePaths";

import type { ScenarioData } from "./schema";

// セッション作成時に scenarioData 内の添付ファイルパスを template/{id}/ から
// session/{id}/ へ移し替える (docs: scenario-editor-architecture D16)。
// 再帰は flow/filePaths と共有し、ステップ列に対する入口だけをここに持つ。
// doc は本文しか持たない (添付は操作ステップ側) ため触らない。
export const convertFilePathsInScenarioData = (
  scenarioData: ScenarioData,
  replacer: (filePath: string) => string,
): ScenarioData => ({
  ...scenarioData,
  steps: convertFilePathsInSteps(scenarioData.steps, replacer),
});
