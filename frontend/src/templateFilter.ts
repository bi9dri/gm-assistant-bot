import type { TemplateMeta } from "./db";

export interface TemplateFilterCriteria {
  system?: string;
  playerCount?: number;
  maxDurationMinutes?: number;
}

/**
 * 一覧の絞り込み判定 (issue #244)。
 *
 * メタ情報が無い軸は「条件を満たすか判断できない」ため、その軸で絞り込んだ時点で除外する。
 * 所要時間は範囲の上限で判定する: 「2〜3 時間」のシナリオは「2 時間以内」に収まらない。
 */
export const matchesTemplateFilter = (
  meta: TemplateMeta,
  criteria: TemplateFilterCriteria,
): boolean => {
  const { system, playerCount, maxDurationMinutes } = criteria;

  if (system !== undefined && meta.system !== system) return false;

  if (playerCount !== undefined) {
    const { playerCountMin: min, playerCountMax: max } = meta;
    if (min === undefined && max === undefined) return false;
    if (min !== undefined && playerCount < min) return false;
    if (max !== undefined && playerCount > max) return false;
  }

  if (maxDurationMinutes !== undefined) {
    const longest = meta.durationMinutesMax ?? meta.durationMinutesMin;
    if (longest === undefined || longest > maxDurationMinutes) return false;
  }

  return true;
};

const formatMinutes = (minutes: number): string =>
  minutes % 60 === 0 ? `${minutes / 60}時間` : `${minutes}分`;

const formatRange = (
  min: number | undefined,
  max: number | undefined,
  format: (value: number) => string,
): string | undefined => {
  if (min !== undefined && max !== undefined) {
    return min === max ? format(min) : `${format(min)}〜${format(max)}`;
  }
  if (min !== undefined) return `${format(min)}以上`;
  if (max !== undefined) return `${format(max)}以下`;
  return undefined;
};

export const formatPlayerCount = (meta: TemplateMeta): string | undefined =>
  formatRange(meta.playerCountMin, meta.playerCountMax, (n) => `${n}人`);

export const formatDuration = (meta: TemplateMeta): string | undefined =>
  formatRange(meta.durationMinutesMin, meta.durationMinutesMax, formatMinutes);
