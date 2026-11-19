import type { ComponentType } from "react";
import type { z } from "zod";

import type { ExecuteContext, ExecuteResult } from "../engine/types";
import type { Step } from "../schema";

export interface DetailPanelProps<S extends Step = Step> {
  step: S;
  onChange: (patch: Partial<S>) => void;
  mode?: "edit" | "execute";
}

export interface StepRegistryEntry<S extends Step = Step> {
  type: S["type"];
  schema: z.ZodType<S>;
  category: "action" | "tool" | "branch" | "text";
  defaults: () => Omit<S, "id">;
  summary: (step: S) => string;
  DetailPanel: ComponentType<DetailPanelProps<S>>;
  execute?: (step: S, ctx: ExecuteContext) => Promise<ExecuteResult>;
}

export const defineStep = <S extends Step>(entry: StepRegistryEntry<S>): StepRegistryEntry => ({
  ...entry,
  summary: (step) => entry.summary(step as S),
  DetailPanel: entry.DetailPanel as unknown as ComponentType<DetailPanelProps>,
  execute: entry.execute === undefined ? undefined : (step, ctx) => entry.execute!(step as S, ctx),
});
