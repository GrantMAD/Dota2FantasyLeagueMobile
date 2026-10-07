import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface LeaderboardEntry {
  id: number;
  rank: number;
  totalPoints: number;
  gameweekPoints: number;
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

function parseEntry(value: unknown): LeaderboardEntry {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    !Number.isInteger(value.rank) ||
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
    totalPoints: value.total_points,
    gameweekPoints: value.gameweek_points,
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
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_leaderboard', {
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
    !isNullableString(result.lastRecalculatedAt)
  ) {
    throw new ApiError('Leaderboard data was returned in an unexpected format.', 502);
  }

  return {
    entries: result.leaderboard.map(parseEntry),
    page: Number(result.pagination.page),
    limit: Number(result.pagination.limit),
    total: Number(result.pagination.total),
    lastRecalculatedAt: result.lastRecalculatedAt,
  };
}
