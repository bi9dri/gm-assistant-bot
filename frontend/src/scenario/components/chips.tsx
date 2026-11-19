import { createContext, useContext, type ComponentType } from "react";

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
