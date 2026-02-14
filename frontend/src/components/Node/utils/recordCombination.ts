export interface OptionItem {
  id: string;
  label: string;
}

export interface RecordedPair {
  id: string;
  sourceId: string;
  targetId: string;
  recordedAt: Date;
  memo?: string;
}

export interface CombinationConfig {
  mode: "same-set" | "different-set";
  allowSelfPairing: boolean;
  allowDuplicates: boolean;
  distinguishOrder: boolean;
  allowMultipleAssignments: boolean;
}

export interface FilteredOption extends OptionItem {
  isDisabled: boolean;
  disabledReason: string;
}

export function getFilteredTargetOptions(
  config: CombinationConfig,
  sourceOptions: OptionItem[],
  targetOptions: OptionItem[] | undefined,
  recordedPairs: RecordedPair[],
  selectedSourceId: string | null,
): FilteredOption[] {
  const baseTargets = config.mode === "same-set" ? sourceOptions : (targetOptions ?? []);

  return baseTargets.map((option) => {
    let isDisabled = false;
    let disabledReason = "";

    if (config.mode === "same-set" && !config.allowSelfPairing && option.id === selectedSourceId) {
      isDisabled = true;
      disabledReason = "自分自身とはペアになれません";
    }

    if (!isDisabled && !config.allowDuplicates && selectedSourceId) {
      const existingPair = recordedPairs.find((pair) => {
        if (config.distinguishOrder) {
          return pair.sourceId === selectedSourceId && pair.targetId === option.id;
        }
        return (
          (pair.sourceId === selectedSourceId && pair.targetId === option.id) ||
          (pair.sourceId === option.id && pair.targetId === selectedSourceId)
        );
      });
      if (existingPair) {
        isDisabled = true;
        disabledReason = "既に記録済みです";
      }
    }

    return { ...option, isDisabled, disabledReason };
  });
}

export function validatePair(
  config: CombinationConfig,
  recordedPairs: RecordedPair[],
  sourceId: string,
  targetId: string,
): { valid: boolean; error?: string } {
  if (!sourceId || !targetId) {
    return { valid: false, error: "両方を選択してください" };
  }

  if (config.mode === "same-set" && !config.allowSelfPairing && sourceId === targetId) {
    return { valid: false, error: "自分自身とはペアになれません" };
  }

  if (!config.allowDuplicates) {
    const isDuplicate = recordedPairs.some((pair) => {
      if (config.distinguishOrder) {
        return pair.sourceId === sourceId && pair.targetId === targetId;
      }
      return (
        (pair.sourceId === sourceId && pair.targetId === targetId) ||
        (pair.sourceId === targetId && pair.targetId === sourceId)
      );
    });
    if (isDuplicate) {
      return { valid: false, error: "このペアは既に記録されています" };
    }
  }

  return { valid: true };
}
