import { getEntry } from "../registry";
import type { Step } from "../schema";

export const canRunStep = (step: Step): boolean => {
  if (getEntry(step.type)?.execute === undefined) return false;
  if (step.type === "Branch" && step.mode === "select") return false;
  return true;
};
