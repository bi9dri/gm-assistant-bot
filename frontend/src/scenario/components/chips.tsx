import { createContext, useContext, type ComponentType } from "react";

// 文中の操作ノード (D24) を何で描くかは編集モードと実行モードで違う。ノードビュー
// (editor/nodeViews.tsx) は ProseMirror の中に居るため store を選べないので、
// 描画コンポーネントを外側から context で渡す。

export interface ChipProps {
  stepId: string;
}

interface ScenarioChips {
  Step: ComponentType<ChipProps>;
  Branch: ComponentType<ChipProps>;
}

const MissingChip = () => <span className="text-xs text-error">(操作を描画できません)</span>;

const ScenarioChipsContext = createContext<ScenarioChips>({
  Step: MissingChip,
  Branch: MissingChip,
});

export const ScenarioChipsProvider = ScenarioChipsContext.Provider;

export const useScenarioChips = (): ScenarioChips => useContext(ScenarioChipsContext);
