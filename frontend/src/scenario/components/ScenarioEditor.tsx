import type { Editor } from "@tiptap/react";
import { useEffect, useMemo, useState, type DragEvent } from "react";

import type { Template } from "@/db";
import { StepDetail } from "@/flow/components/DetailPanel";
import { FlagPanelView } from "@/flow/components/FlagPanel";
import { MessageAttachmentTargetProvider } from "@/flow/components/messageContext";
import { collectResourcesFromSteps } from "@/flow/resources";
import type { Step } from "@/flow/schema";
import { findStepIn } from "@/flow/treeOps";
import { useToast } from "@/toast/ToastProvider";

import { SaveStateBadge, useScenarioAutosave, type AutosaveSource } from "../autosave";
import { useScenarioDocument } from "../editor/useScenarioDocument";
import { useScenarioEditorStore } from "../store/editorStore";
import { isImportableTextFile, splitParagraphs } from "../textTransfer";
import { ScenarioChipsProvider } from "./chips";
import { EditorBranchBlock, EditorStepChip } from "./EditorChips";
import { ScenarioDocument } from "./ScenarioDocument";
import { TableOfContents } from "./TableOfContents";
import { Toolbar } from "./Toolbar";

const editorSource: AutosaveSource = {
  subscribe: (listener) =>
    useScenarioEditorStore.subscribe((state, prev) => {
      if (!state.initialized) return;
      if (
        state.doc === prev.doc &&
        state.steps === prev.steps &&
        state.gameFlags === prev.gameFlags
      )
        return;
      listener();
    }),
  snapshot: () => {
    const { doc, steps, gameFlags } = useScenarioEditorStore.getState();
    return { doc, steps, gameFlags };
  },
};

const CHIPS = { Step: EditorStepChip, Branch: EditorBranchBlock };

export const SidePanel = ({ steps, selectedId }: { steps: Step[]; selectedId: string | null }) => {
  const gameFlags = useScenarioEditorStore((state) => state.gameFlags);
  const setGameFlag = useScenarioEditorStore((state) => state.setGameFlag);
  const removeGameFlag = useScenarioEditorStore((state) => state.removeGameFlag);
  const updateStep = useScenarioEditorStore((state) => state.updateStep);

  const resources = useMemo(() => collectResourcesFromSteps(steps, gameFlags), [steps, gameFlags]);
  const step = selectedId === null ? undefined : findStepIn(steps, selectedId);

  return (
    <div className="flex flex-col">
      {step === undefined ? (
        <p className="p-4 text-sm text-base-content/40">本文中の操作を選択してください</p>
      ) : (
        <StepDetail
          step={step}
          resources={resources}
          onChange={(patch) => updateStep(step.id, patch)}
        />
      )}
      <div className="divider my-0" />
      <FlagPanelView
        gameFlags={gameFlags}
        setGameFlag={setGameFlag}
        removeGameFlag={removeGameFlag}
      />
    </div>
  );
};

const useTextFileDrop = (editor: Editor | null) => {
  const { addToast } = useToast();

  const importFiles = async (files: File[]) => {
    try {
      const texts = await Promise.all(
        files.map(async (file) =>
          new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()),
        ),
      );
      editor
        ?.chain()
        .focus()
        .insertContent(
          texts.flatMap(splitParagraphs).map((paragraph) => ({
            type: "paragraph",
            content: [{ type: "text", text: paragraph }],
          })),
        )
        .run();
    } catch {
      addToast({
        message: "ファイルを取り込めませんでした (UTF-8 のテキストのみ)",
        status: "error",
        durationSeconds: 5,
      });
    }
  };

  return {
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (event.dataTransfer.types.includes("Files")) event.preventDefault();
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files).filter(isImportableTextFile);
      if (files.length > 0) void importFiles(files);
    },
  };
};

export const ScenarioEditor = ({ template }: { template: Template }) => {
  const initialize = useScenarioEditorStore((state) => state.initialize);
  const setDoc = useScenarioEditorStore((state) => state.setDoc);
  const createStep = useScenarioEditorStore((state) => state.createStep);
  const doc = useScenarioEditorStore((state) => state.doc);
  const steps = useScenarioEditorStore((state) => state.steps);
  const selectedStepId = useScenarioEditorStore((state) => state.selectedStepId);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  useEffect(() => {
    if (loadedId === template.id) return;
    const scenario = template.getParsedScenarioData();
    initialize(scenario.doc, scenario.steps, template.getParsedGameFlags());
    setLoadedId(template.id);
  }, [template, loadedId, initialize]);

  const saveState = useScenarioAutosave(template, editorSource);
  const editor = useScenarioDocument({
    doc,
    editable: true,
    recordKey: loadedId,
    onChange: setDoc,
  });
  const fileDrop = useTextFileDrop(editor);

  return (
    <MessageAttachmentTargetProvider value={{ templateId: template.id }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-4 py-2">
          <h2 className="font-semibold">{template.name}</h2>
          <span className="text-xs text-base-content/50">シナリオ編集</span>
          <SaveStateBadge saveState={saveState} />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(180px,0.6fr)_minmax(420px,1.8fr)_minmax(280px,1fr)] divide-x divide-base-300">
          <div className="min-h-0 overflow-y-auto">
            <TableOfContents doc={doc} />
          </div>
          <div className="flex min-h-0 flex-col">
            <Toolbar editor={editor} onInsertStep={createStep} />
            <div className="min-h-0 flex-1 overflow-y-auto" {...fileDrop}>
              <ScenarioChipsProvider value={CHIPS}>
                <ScenarioDocument editor={editor} />
              </ScenarioChipsProvider>
              <p className="px-4 pb-3 text-xs text-base-content/40">
                .txt / .md をここにドロップすると、空行区切りで段落として取り込みます
              </p>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto">
            <SidePanel steps={steps} selectedId={selectedStepId} />
          </div>
        </div>
      </div>
    </MessageAttachmentTargetProvider>
  );
};
