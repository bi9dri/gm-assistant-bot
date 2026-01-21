import { useCallback, useEffect, useRef, useState } from "react";

import { GameSession } from "@/db";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";

interface UseAutoSaveOptions {
  sessionId: number | undefined;
  enabled: boolean;
  debounceMs?: number;
  showSavedDurationMs?: number;
}

interface UseAutoSaveReturn {
  showSaved: boolean;
}

export function useAutoSave({
  sessionId,
  enabled,
  debounceMs = 500,
  showSavedDurationMs = 2000,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const [showSaved, setShowSaved] = useState(false);

  const save = useCallback(async () => {
    if (!sessionId || isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      const { nodes, edges, viewport } = useTemplateEditorStore.getState();
      const session = await GameSession.getById(sessionId);
      if (session) {
        await session.update({ reactFlowData: { nodes, edges, viewport } });

        // 保存完了インジケーターを表示
        setShowSaved(true);
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current);
        }
        savedTimeoutRef.current = setTimeout(() => {
          setShowSaved(false);
        }, showSavedDurationMs);
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [sessionId, showSavedDurationMs]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const unsubscribe = useTemplateEditorStore.subscribe((state, prevState) => {
      // nodes または edges が変更された場合のみトリガー
      if (state.nodes === prevState.nodes && state.edges === prevState.edges) {
        return;
      }

      // 既存の timeout をクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 新しい debounce タイマーを設定
      timeoutRef.current = setTimeout(save, debounceMs);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessionId, enabled, debounceMs, save]);

  return { showSaved };
}
