import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface DirectoryPlayer {
  id: number;
  name: string;
  in_game_name: string | null;
  primary_role: string | null;
  availability_status: string | null;
  current_price: number | null;
  gameweek_points: number;
  recent_points: number;
  team_name: string | null;
  profile_image_url: string | null;
}

export interface PlayerPage {
  players: DirectoryPlayer[];
  total: number | null;
  limit: number;
  offset: number;
}

export interface PlayerPerformance {
  id: number;
  gameweek_id: number;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  total_points: number;
}

export interface PlayerDetail extends DirectoryPlayer {
  country: string | null;
  ownership_percentage: number;
  total_season_points: number;
  last_gw_points: number;
  availability_reason: string | null;
  performances: PlayerPerformance[];
}

export function normalizePlayerComparisonIds(value: string): number[] {
  return [...new Set(value
    .split(',')
    .map((item) => Number(item))
    .filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 4);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePlayer(value: unknown): DirectoryPlayer {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.name !== 'string' ||
    (value.current_price !== null &&
      (typeof value.current_price !== 'number' || !Number.isFinite(value.current_price))) ||
    typeof value.gameweek_points !== 'number' ||
    typeof value.recent_points !== 'number'
  ) {
    throw new ApiError('Player directory data was returned in an unexpected format.', 502);
  }

  const rawTeam = value.professional_teams;
  const team = Array.isArray(rawTeam) ? rawTeam[0] ?? null : rawTeam;
  if (team !== null && (!isRecord(team) || typeof team.name !== 'string')) {
    throw new ApiError('Player directory data was returned in an unexpected format.', 502);
  }

  return {
    id: Number(value.id),
    name: value.name,
    in_game_name: typeof value.in_game_name === 'string' ? value.in_game_name : null,
    primary_role: typeof value.primary_role === 'string' ? value.primary_role : null,
    availability_status: typeof value.availability_status === 'string'
      ? value.availability_status
      : null,
    current_price: typeof value.current_price === 'number' ? value.current_price : null,
    gameweek_points: value.gameweek_points,
    recent_points: value.recent_points,
    team_name: isRecord(team) ? String(team.name) : null,
    profile_image_url: typeof value.profile_image_url === 'string' ? value.profile_image_url : null,
  };
}

export async function getPlayers(params: {
  search: string;
  role: string;
  availableOnly: boolean;
  offset: number;
  limit: number;
}): Promise<PlayerPage> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_players', {
    p_search: params.search.trim(),
    p_role: params.role,
    p_available_only: params.availableOnly,
    p_offset: params.offset,
    p_limit: params.limit,
  });
  if (error) throw new ApiError(`Unable to load players: ${error.message}`, 500);
  if (
    !isRecord(result) ||
    !Array.isArray(result.data) ||
    !(
      result.total === null ||
      (typeof result.total === 'number' && Number.isFinite(result.total))
    ) ||
    typeof result.limit !== 'number' ||
    typeof result.offset !== 'number'
  ) {
    throw new ApiError('Player directory data was returned in an unexpected format.', 502);
  }

  return {
    players: result.data.map(parsePlayer),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  };
}

export async function getPlayerDetail(playerId: number): Promise<PlayerDetail> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_player_detail', {
    p_player_id: playerId,
  });
  if (error) throw new ApiError(`Unable to load player details: ${error.message}`, 500);
  if (!isRecord(result) || !isRecord(result.player)) {
    throw new ApiError('Player details were returned in an unexpected format.', 502);
  }
  const raw = result.player;
  const directory = parsePlayer({
    ...raw,
    gameweek_points: raw.last_gw_points,
    recent_points: raw.recent_points ?? 0,
  });
  if (
    typeof raw.ownership_percentage !== 'number' ||
    typeof raw.total_season_points !== 'number' ||
    typeof raw.last_gw_points !== 'number' ||
    !Array.isArray(raw.performances)
  ) {
    throw new ApiError('Player details were returned in an unexpected format.', 502);
  }

  const performances = raw.performances.map((performance): PlayerPerformance => {
    if (
      !isRecord(performance) ||
      !Number.isInteger(performance.id) ||
      !Number.isInteger(performance.gameweek_id)
    ) {
      throw new ApiError('Player performance data was returned in an unexpected format.', 502);
    }
    const breakdownValue = performance.fantasy_points_breakdown;
    const breakdown = Array.isArray(breakdownValue) ? breakdownValue[0] : breakdownValue;
    if (breakdown !== null && breakdown !== undefined && !isRecord(breakdown)) {
      throw new ApiError('Player performance data was returned in an unexpected format.', 502);
    }
    const totalPoints = isRecord(breakdown) && typeof breakdown.total_points === 'number'
      ? breakdown.total_points
      : 0;
    const optionalStat = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) ? value : null;
    return {
      id: Number(performance.id),
      gameweek_id: Number(performance.gameweek_id),
      kills: optionalStat(performance.kills),
      deaths: optionalStat(performance.deaths),
      assists: optionalStat(performance.assists),
      total_points: totalPoints,
    };
  });

  return {
    ...directory,
    country: typeof raw.country === 'string' ? raw.country : null,
    ownership_percentage: raw.ownership_percentage,
    total_season_points: raw.total_season_points,
    last_gw_points: raw.last_gw_points,
    availability_reason: typeof raw.availability_reason === 'string' ? raw.availability_reason : null,
    performances,
  };
}
