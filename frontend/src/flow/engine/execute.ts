import type { FlowData, Step } from "../schema";
import type { ExecuteResult } from "./types";

import { findStep } from "../treeOps";
import { advanceCursor } from "./order";

// engine は orchestration だけを持つ (docs: "The engine ... owns orchestration only")。
// 1 ステップを走らせ、そのステップが autoAdvance なら次ステップへ連鎖する。
// 実行そのもの (ctx 構築・execute() 呼び出し・executedAt/executedBranchIds の永続化) は
// StepRunner に委譲する。これにより連鎖・分岐 descend のロジックだけを純粋に unit-test できる。

export interface StepRunner {
  // 最新の flow を返す。runOne 後に Branch の枝が開くと advanceCursor の結果が変わるため、
  // 連鎖の各周回で読み直す。
  getFlow(): FlowData;
  // 1 ステップを実行し executedAt (Branch は executedBranchIds も) を永続化する。
  runOne(stepId: string): Promise<ExecuteResult>;
  // 連鎖の「次ステップ」を GM 入力なしに自動実行してよいか。false のもの (select 分岐・
  // execute を持たない tool 等) に達したら連鎖は静かに停止する (エラーにしない)。
  canAutoRun(step: Step): boolean;
}

// startId から実行を開始し、成功しつつ autoAdvance が続く限り次ステップへ連鎖する。
// 各ステップの結果を配列で返す。失敗したステップで連鎖は止まる。
//
// 連鎖先のガード (開始ステップ自身は GM の明示操作なので対象外):
// - 既に実行済み (executedAt) のステップは再実行しない (Discord 副作用の二重発火を防ぐ)。
// - 自動実行できない (canAutoRun=false) ステップの手前で静かに停止する。
export const runChain = async (runner: StepRunner, startId: string): Promise<ExecuteResult[]> => {
  const results: ExecuteResult[] = [];
  let currentId: string | null = startId;
  let isStart = true;

  while (currentId !== null) {
    const step = findStep(runner.getFlow(), currentId);
    if (step === undefined) break;

    if (!isStart && (step.executedAt !== undefined || !runner.canAutoRun(step))) break;

    const result = await runner.runOne(currentId);
    results.push(result);
    isStart = false;

    // 失敗したら連鎖しない。autoAdvance が無ければ 1 ステップで止まる。
    if (result.status !== "success" || !step.autoAdvance) break;

    currentId = advanceCursor(runner.getFlow(), currentId);
  }

  return results;
};
