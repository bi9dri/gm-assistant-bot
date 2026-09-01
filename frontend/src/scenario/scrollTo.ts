// 本文内の位置へスクロールする。目次のクリックと実行モードのカーソル追従が共有する。
// heading ノードは id を持たない (ProseMirror ドキュメント 1 本・D8) ため、
// 見出しは本文コンテナ内の出現順で引く。

// 本文エディタのルート。ScenarioDocument がこの class を付ける。
export const SCENARIO_DOC_CLASS = "scenario-doc";

const scrollTo = (element: Element | null | undefined): void =>
  element?.scrollIntoView({ behavior: "smooth", block: "start" });

// 操作チップ (StepChip / BranchBlock が id="step-{id}" で描画する) へ。
export const scrollToStep = (stepId: string): void =>
  scrollTo(document.getElementById(`step-${stepId}`));

export const scrollToHeading = (index: number): void => {
  const doc = document.querySelector(`.${SCENARIO_DOC_CLASS}`);
  // querySelectorAll は文書順で返すため、目次の index がそのまま添字になる。
  scrollTo(doc?.querySelectorAll("h1, h2, h3")[index]);
};
