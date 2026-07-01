import { useCallback } from "react";

import type { DiscordBotData, GameSession } from "@/db";

import { useToast } from "@/toast/ToastProvider";

import type { StepRunner } from "../engine/execute";
import type { ExecuteContext } from "../engine/types";

import { runChain } from "../engine/execute";
import { createDiscordGateway } from "../engine/gateway";
import { loadResourceStore } from "../engine/resourceStore";
import { getEntry } from "../registry";
import { useRunnerStore } from "../store/runnerStore";
import { findStep } from "../treeOps";
import { canRunStep } from "./canRun";

interface RunOptions {
  // Branch select モードで GM が選んだ枝 (arm) id。開始ステップにのみ適用される。
  branchChoice?: string;
}

// engine と store・db・ApiClient を配線するフック。engine/execute() は純粋なまま、
// ここが副作用 (ctx 構築・実行・store 更新・toast) を担う。
export const useSessionRunner = (session: GameSession, bot: DiscordBotData) => {
  const { addToast } = useToast();

  const runStep = useCallback(
    async (stepId: string, options: RunOptions = {}): Promise<void> => {
      if (useRunnerStore.getState().runningStepId !== null) return;

      const startStep = findStep(useRunnerStore.getState().flowData, stepId);
      if (startStep === undefined) return;
      if (getEntry(startStep.type)?.execute === undefined) {
        addToast({ message: "このステップは自動実行できません", status: "warning" });
        return;
      }

      useRunnerStore.getState().setRunningStep(stepId);
      const gateway = createDiscordGateway(bot, session.guildId);

      const runner: StepRunner = {
        getFlow: () => useRunnerStore.getState().flowData,
        canAutoRun: canRunStep,
        runOne: async (id) => {
          const step = findStep(useRunnerStore.getState().flowData, id);
          if (step === undefined) return { status: "error", message: "ステップが見つかりません" };

          const stepEntry = getEntry(step.type);
          if (stepEntry?.execute === undefined) {
            return { status: "error", message: "このステップは自動実行できません" };
          }

          // リソースはステップごとにロードし直し、直前ステップの副作用を反映する。
          const resources = await loadResourceStore(session.id, session.guildId);
          const ctx: ExecuteContext = {
            guildId: session.guildId,
            sessionId: session.id,
            sessionName: session.name,
            discord: gateway,
            resources,
            flags: {
              // FlagStore 契約はスナップショット。store の内部オブジェクトを直接返さず
              // コピーを返し、execute() が誤って書き換えても store を壊さないようにする。
              get: () => ({ ...useRunnerStore.getState().gameFlags }),
              set: async (patch) => {
                useRunnerStore.getState().setFlags(patch);
              },
            },
            // GM の選択は開始ステップにのみ適用 (連鎖先の select 分岐には引き継がない)。
            branchChoice: id === stepId ? options.branchChoice : undefined,
          };

          const result = await stepEntry.execute(step, ctx);
          if (result.status === "success") {
            useRunnerStore
              .getState()
              .markStepExecuted(id, { executedBranchIds: result.branchArmIds });
          }
          return result;
        },
      };

      try {
        const results = await runChain(runner, stepId);
        const failure = results.find((result) => result.status === "error");
        const last = results[results.length - 1];
        if (failure !== undefined) {
          addToast({ message: failure.message, status: "error" });
        } else if (last !== undefined) {
          addToast({
            message: last.message !== "" ? last.message : "実行しました",
            status: "success",
            durationSeconds: 5,
          });
        }
      } catch (error) {
        console.error("Failed to run step:", error);
        addToast({ message: "実行中にエラーが発生しました", status: "error" });
      } finally {
        useRunnerStore.getState().setRunningStep(null);
      }
    },
    [session, bot, addToast],
  );

  return { runStep };
};
