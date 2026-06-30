import { beforeEach, describe, expect, test } from "bun:test";

import { defaultFlowData } from "../schema";
import { useEditorStore } from "./editorStore";

const sectionContainer = (sectionId: string) => ({ kind: "section" as const, sectionId });

describe("editorStore", () => {
  beforeEach(() => {
    useEditorStore.setState({
      flowData: {
        version: 1,
        sections: [{ id: "s1", title: "S1", memo: "", collapsed: false, steps: [] }],
      },
      gameFlags: {},
      selectedStepId: null,
      initialized: true,
    });
  });

  test("addStep は registry の defaults で採番して挿入し選択する", () => {
    useEditorStore
      .getState()
      .addStep("SetGameFlag", { container: sectionContainer("s1"), index: 0 });
    const state = useEditorStore.getState();
    expect(state.flowData.sections[0]?.steps).toHaveLength(1);
    expect(state.flowData.sections[0]?.steps[0]?.type).toBe("SetGameFlag");
    expect(state.selectedStepId).toBe(state.flowData.sections[0]?.steps[0]?.id);
  });

  test("addStep は未知のタイプを無視する", () => {
    useEditorStore
      .getState()
      .addStep("Nope" as never, { container: sectionContainer("s1"), index: 0 });
    expect(useEditorStore.getState().flowData.sections[0]?.steps).toHaveLength(0);
  });

  test("updateStep はフィールドを浅くマージする", () => {
    useEditorStore
      .getState()
      .addStep("SetGameFlag", { container: sectionContainer("s1"), index: 0 });
    const id = useEditorStore.getState().selectedStepId ?? "";
    useEditorStore.getState().updateStep(id, { title: "更新後" });
    expect(useEditorStore.getState().flowData.sections[0]?.steps[0]?.title).toBe("更新後");
  });

  test("removeStep は選択を解除する", () => {
    useEditorStore
      .getState()
      .addStep("SetGameFlag", { container: sectionContainer("s1"), index: 0 });
    const id = useEditorStore.getState().selectedStepId ?? "";
    useEditorStore.getState().removeStep(id);
    expect(useEditorStore.getState().flowData.sections[0]?.steps).toHaveLength(0);
    expect(useEditorStore.getState().selectedStepId).toBeNull();
  });

  test("moveStep は同一セクション内で並べ替える", () => {
    const store = useEditorStore.getState();
    store.addStep("SetGameFlag", { container: sectionContainer("s1"), index: 0 });
    store.addStep("CreateRole", { container: sectionContainer("s1"), index: 1 });
    const firstId = useEditorStore.getState().flowData.sections[0]?.steps[0]?.id ?? "";
    store.moveStep(firstId, { container: sectionContainer("s1"), index: 1 });
    expect(useEditorStore.getState().flowData.sections[0]?.steps[1]?.id).toBe(firstId);
  });

  test("selectStep", () => {
    useEditorStore.getState().selectStep("x");
    expect(useEditorStore.getState().selectedStepId).toBe("x");
  });

  test("addSection / moveSection / removeSection / updateSection", () => {
    const store = useEditorStore.getState();
    store.addSection("S2");
    expect(useEditorStore.getState().flowData.sections).toHaveLength(2);
    const s2 = useEditorStore.getState().flowData.sections[1]?.id ?? "";
    store.moveSection(s2, 0);
    expect(useEditorStore.getState().flowData.sections[0]?.id).toBe(s2);
    store.updateSection(s2, { collapsed: true });
    expect(useEditorStore.getState().flowData.sections[0]?.collapsed).toBe(true);
    store.removeSection(s2);
    expect(useEditorStore.getState().flowData.sections).toHaveLength(1);
  });

  test("setGameFlag / removeGameFlag", () => {
    const store = useEditorStore.getState();
    store.setGameFlag("phase", "day");
    expect(useEditorStore.getState().gameFlags.phase).toBe("day");
    store.removeGameFlag("phase");
    expect("phase" in useEditorStore.getState().gameFlags).toBe(false);
  });

  test("initialize / reset", () => {
    useEditorStore.getState().initialize({ version: 1, sections: [] }, { a: 1 });
    expect(useEditorStore.getState().initialized).toBe(true);
    expect(useEditorStore.getState().gameFlags.a).toBe(1);
    useEditorStore.getState().reset();
    expect(useEditorStore.getState().initialized).toBe(false);
    expect(useEditorStore.getState().flowData).toEqual(defaultFlowData);
  });
});
