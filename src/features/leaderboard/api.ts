import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface LeaderboardEntry {
  id: number;
  rank: number;
  previousRank: number | null;
  totalPoints: number;
  gameweekPoints: number;
  isPinned: boolean;
  fantasyTeam: {
    id: number | null;
    name: string;
    userId: string | null;
    managerName: string;
    username: string | null;
  };
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  page: number;
  limit: number;
  total: number;
  lastRecalculatedAt: string | null;
  topGameweekScorer: {
    fantasySeasonId: number;
    manager: string;
    points: number;
  } | null;
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

function isTopGameweekScorer(
  value: unknown,
): value is { fantasySeasonId: number; manager: string; points: number } {
  return isRecord(value) &&
    Number.isInteger(value.fantasySeasonId) &&
    typeof value.manager === 'string' &&
    typeof value.points === 'number' &&
    Number.isFinite(value.points);
}

function parseEntry(value: unknown): LeaderboardEntry {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    !Number.isInteger(value.rank) ||
    !isNullableNumber(value.previous_rank) ||
    (value.is_pinned !== undefined && typeof value.is_pinned !== 'boolean') ||
    typeof value.total_points !== 'number' ||
    !Number.isFinite(value.total_points) ||
    typeof value.gameweek_points !== 'number' ||
    !Number.isFinite(value.gameweek_points) ||
    !isRecord(value.fantasy_teams) ||
    !isNullableNumber(value.fantasy_teams.id) ||
    typeof value.fantasy_teams.name !== 'string' ||
    !isNullableString(value.fantasy_teams.user_id)
  ) {
    throw new ApiError('Leaderboard data was returned in an unexpected format.', 502);
  }

  const profile = value.fantasy_teams.profiles;
  if (profile !== null && (!isRecord(profile) ||
    !isNullableString(profile.username) ||
    !isNullableString(profile.display_name))) {
    throw new ApiError('Leaderboard manager data was returned in an unexpected format.', 502);
  }
  const displayName = isRecord(profile) && typeof profile.display_name === 'string'
    ? profile.display_name
    : null;
  const username = isRecord(profile) && typeof profile.username === 'string'
    ? profile.username
    : null;

  return {
    id: Number(value.id),
    rank: Number(value.rank),
    previousRank: value.previous_rank,
    totalPoints: value.total_points,
    gameweekPoints: value.gameweek_points,
    isPinned: value.is_pinned === true,
    fantasyTeam: {
      id: value.fantasy_teams.id,
      name: value.fantasy_teams.name,
      userId: value.fantasy_teams.user_id,
      managerName: displayName || username || value.fantasy_teams.name,
      username,
    },
  };
}

export async function getLeaderboard(params: {
  page: number;
  gameweekId: number | null;
}): Promise<LeaderboardPage> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_leaderboard_v2', {
    p_page: params.page,
    p_gameweek_id: params.gameweekId,
  });
  if (error) throw new ApiError(`Unable to load leaderboard: ${error.message}`, 500);

  if (
    !isRecord(result) ||
    !Array.isArray(result.leaderboard) ||
    !isRecord(result.pagination) ||
    !Number.isInteger(result.pagination.page) ||
    !Number.isInteger(result.pagination.limit) ||
    !Number.isInteger(result.pagination.total) ||
    !isNullableString(result.lastRecalculatedAt) ||
    !(result.topGameweekScorer === null || isTopGameweekScorer(result.topGameweekScorer))
  ) {
    throw new ApiError('Leaderboard data was returned in an unexpected format.', 502);
  }

  return {
    entries: result.leaderboard.map(parseEntry),
    page: Number(result.pagination.page),
    limit: Number(result.pagination.limit),
    total: Number(result.pagination.total),
    lastRecalculatedAt: result.lastRecalculatedAt,
    topGameweekScorer: result.topGameweekScorer === null
      ? null
      : {
          fantasySeasonId: result.topGameweekScorer.fantasySeasonId,
          manager: result.topGameweekScorer.manager,
          points: result.topGameweekScorer.points,
        },
  };
}
