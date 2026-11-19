import type { JSONContent } from "@tiptap/core";
import { useEffect, useRef, useState } from "react";

import type { GameFlags } from "@/db";
import type { Step } from "@/flow/schema";

import { orderedSteps } from "./document";
import { ScenarioDataSchema, type ScenarioData } from "./schema";

const AUTOSAVE_DEBOUNCE_MS = 500;
const SAVED_INDICATOR_MS = 2000;

export type SaveState = "saved" | "invalid" | "error" | null;

export interface AutosaveSource {
  subscribe: (listener: () => void) => () => void;
  snapshot: () => { doc: JSONContent; steps: Step[]; gameFlags: GameFlags };
}

interface AutosaveRecord {
  id: number;
  update: (patch: { scenarioData: ScenarioData; gameFlags: GameFlags }) => Promise<void>;
}

export const useScenarioAutosave = (record: AutosaveRecord, source: AutosaveSource): SaveState => {
  const [saveState, setSaveState] = useState<SaveState>(null);

  const recordRef = useRef(record);
  recordRef.current = record;

  useEffect(() => {
    const recordId = record.id;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let savedTimeout: ReturnType<typeof setTimeout> | null = null;
    let saveSeq = 0;

    const save = () => {
      if (recordRef.current.id !== recordId) return;
      const seq = ++saveSeq;
      const { doc, steps, gameFlags } = source.snapshot();
      const parsed = ScenarioDataSchema.safeParse({
        version: 2,
        doc,
        steps: orderedSteps(doc, steps),
      });
      if (!parsed.success) {
        if (savedTimeout !== null) clearTimeout(savedTimeout);
        savedTimeout = null;
        setSaveState("invalid");
        return;
      }
      recordRef.current
        .update({ scenarioData: parsed.data, gameFlags })
        .then(() => {
          if (seq !== saveSeq) return;
          setSaveState("saved");
          if (savedTimeout !== null) clearTimeout(savedTimeout);
          savedTimeout = setTimeout(() => setSaveState(null), SAVED_INDICATOR_MS);
        })
        .catch((error: unknown) => {
          console.error("Failed to autosave scenarioData:", error);
          if (seq !== saveSeq) return;
          if (savedTimeout !== null) clearTimeout(savedTimeout);
          savedTimeout = null;
          setSaveState("error");
        });
    };

    const unsubscribe = source.subscribe(() => {
      if (timeout !== null) clearTimeout(timeout);
      timeout = setTimeout(save, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (savedTimeout !== null) clearTimeout(savedTimeout);
      if (timeout === null) return;
      clearTimeout(timeout);
      save();
    };
  }, [record.id, source]);

  return saveState;
};

export const SaveStateBadge = ({ saveState }: { saveState: SaveState }) => (
  <>
    {saveState === "saved" && <span className="badge badge-success badge-sm">保存しました</span>}
    {saveState === "invalid" && (
      <span className="badge badge-warning badge-sm">未保存: 入力に不備があります</span>
    )}
    {saveState === "error" && (
      <span className="badge badge-error badge-sm">保存に失敗しました</span>
    )}
  </>
);
