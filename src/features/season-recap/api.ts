import { ApiError, apiFetch } from '@/src/lib/api';

export interface SeasonRecap {
  seasonId: number;
  fantasySeasonId: number;
  seasonName: string;
  startDate: string | null;
  endDate: string | null;
  totalPoints: number;
  finalGlobalRank: number | null;
  bestGameweek: { gameweek: number; points: number } | null;
  rankProgression: { startingRank: number; finalRank: number } | null;
  topPlayer: { name: string; points: number } | null;
  transferCount: number;
  bestLeagueRank: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseRecap(value: unknown): SeasonRecap {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.seasonId) ||
    !Number.isInteger(value.fantasySeasonId) ||
    typeof value.seasonName !== 'string' ||
    !isNullableString(value.startDate) ||
    !isNullableString(value.endDate) ||
    typeof value.totalPoints !== 'number' ||
    !Number.isFinite(value.totalPoints) ||
    !isNullableNumber(value.finalGlobalRank) ||
    !isNullableNumber(value.bestLeagueRank) ||
    !Number.isInteger(value.transferCount)
  ) {
    throw new ApiError('Season recap data was returned in an unexpected format.', 502);
  }

  let bestGameweek: SeasonRecap['bestGameweek'] = null;
  if (value.bestGameweek !== null) {
    if (
      !isRecord(value.bestGameweek) ||
      !Number.isInteger(value.bestGameweek.gameweek) ||
      typeof value.bestGameweek.points !== 'number' ||
      !Number.isFinite(value.bestGameweek.points)
    ) {
      throw new ApiError('Best gameweek data was returned in an unexpected format.', 502);
    }
    bestGameweek = {
      gameweek: Number(value.bestGameweek.gameweek),
      points: value.bestGameweek.points,
    };
  }

  let rankProgression: SeasonRecap['rankProgression'] = null;
  if (value.rankProgression !== null) {
    if (
      !isRecord(value.rankProgression) ||
      !Number.isInteger(value.rankProgression.startingRank) ||
      !Number.isInteger(value.rankProgression.finalRank)
    ) {
      throw new ApiError('Rank progression data was returned in an unexpected format.', 502);
    }
    rankProgression = {
      startingRank: Number(value.rankProgression.startingRank),
      finalRank: Number(value.rankProgression.finalRank),
    };
  }

  let topPlayer: SeasonRecap['topPlayer'] = null;
  if (value.topPlayer !== null) {
    if (
      !isRecord(value.topPlayer) ||
      typeof value.topPlayer.name !== 'string' ||
      typeof value.topPlayer.points !== 'number' ||
      !Number.isFinite(value.topPlayer.points)
    ) {
      throw new ApiError('Top player data was returned in an unexpected format.', 502);
    }
    topPlayer = { name: value.topPlayer.name, points: value.topPlayer.points };
  }

  return {
    seasonId: Number(value.seasonId),
    fantasySeasonId: Number(value.fantasySeasonId),
    seasonName: value.seasonName,
    startDate: value.startDate,
    endDate: value.endDate,
    totalPoints: value.totalPoints,
    finalGlobalRank: value.finalGlobalRank,
    bestGameweek,
    rankProgression,
    topPlayer,
    transferCount: Number(value.transferCount),
    bestLeagueRank: value.bestLeagueRank,
  };
}

export async function getSeasonRecaps(): Promise<SeasonRecap[]> {
  const result = await apiFetch<unknown>('/api/season-recap');
  if (!isRecord(result) || !Array.isArray(result.recaps)) {
    throw new ApiError('Season recap data was returned in an unexpected format.', 502);
  }
  return result.recaps.map(parseRecap);
}
