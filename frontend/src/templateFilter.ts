import type { TemplateMeta } from "./db";

export interface TemplateFilterCriteria {
  system?: string;
  playerCount?: number;
  maxDurationMinutes?: number;
}

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
    const { durationMinutesMax: longest } = meta;
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
