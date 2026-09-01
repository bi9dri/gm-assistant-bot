import type { JSONContent } from "@tiptap/core";
import { useEffect, useRef, useState } from "react";

import type { GameFlags } from "@/db";
import type { Step } from "@/flow/schema";

import { orderedSteps } from "./document";
import { ScenarioDataSchema, type ScenarioData } from "./schema";

// doc / steps / gameFlags の変更を debounce して Template / GameSession に保存する。
// 編集モード (Template.scenarioData) と実行モード (GameSession.scenarioData) は
// 見ている store が違うだけなので、store の覗き方だけを source として受け取る。

const AUTOSAVE_DEBOUNCE_MS = 500;
const SAVED_INDICATOR_MS = 2000;

export type SaveState = "saved" | "invalid" | "error" | null;

export interface AutosaveSource {
  // 保存対象の変更だけを listener に伝える (zustand store の subscribe を包む)。
  subscribe: (listener: () => void) => () => void;
  snapshot: () => { doc: JSONContent; steps: Step[]; gameFlags: GameFlags };
}

interface AutosaveRecord {
  id: number;
  update: (patch: { scenarioData: ScenarioData; gameFlags: GameFlags }) => Promise<void>;
}

// 保存要求には世代番号を振り、update() の解決順が前後しても最新要求の結果だけを
// UI に反映する (遅延した "保存しました" が後続の "未保存" を上書きしない)。
export const useScenarioAutosave = (record: AutosaveRecord, source: AutosaveSource): SaveState => {
  const [saveState, setSaveState] = useState<SaveState>(null);

  // 毎保存で useLiveQuery がレコードを差し替えても購読を張り直さないよう、
  // 購読 effect は id でのみ依存し、最新レコードは ref で読む。
  const recordRef = useRef(record);
  recordRef.current = record;

  useEffect(() => {
    const recordId = record.id;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let savedTimeout: ReturnType<typeof setTimeout> | null = null;
    let saveSeq = 0;

    const save = () => {
      // 対象レコードの切り替えでは、まず購読の後始末 (= 未保存分の flush) が走り、
      // その時点で ref は新しいレコードを指している。store もまだ前の画面の内容なので、
      // そのまま書くと前の内容が新しいレコードへ移ってしまう。
      if (recordRef.current.id !== recordId) return;
      const seq = ++saveSeq;
      const { doc, steps, gameFlags } = source.snapshot();
      // 本文から参照が消えた実体 (孤児) を落とすのは保存のこの一点だけ (D25)。
      // 編集途中の不完全なステップ (空のロール行など) は保存しない。update が parse で
      // throw して編集が無言で失われるのを防ぎ、「未保存」を明示する。
      const parsed = ScenarioDataSchema.safeParse({
        version: 2,
        doc,
        steps: orderedSteps(doc, steps),
      });
      if (!parsed.success) {
        // 「未保存」を sticky に保つ (直前の保存成功が予約した自動消去を止める)。
        if (savedTimeout !== null) clearTimeout(savedTimeout);
        savedTimeout = null;
        setSaveState("invalid");
        return;
      }
      recordRef.current
        .update({ scenarioData: parsed.data, gameFlags })
        .then(() => {
          if (seq !== saveSeq) return; // 後続の保存要求が出ていれば古い結果は捨てる
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
      // debounce 待ちのまま画面を離れると、直前の打鍵が無言で消える。
      // タイマーを捨てる前に一度だけ保存し切る。
      clearTimeout(timeout);
      save();
    };
  }, [record.id, source]);

  return saveState;
};

// 保存状態のバッジ (ヘッダ右)。編集・実行の両モードで同じ文言を出す。
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
