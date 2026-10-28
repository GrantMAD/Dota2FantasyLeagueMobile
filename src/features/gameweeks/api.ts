import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface GameweekSummary {
  id: number;
  gameweek_number: number;
  start_date: string | null;
  end_date: string | null;
  deadline: string | null;
  status: string;
  match_count: number;
  tournaments: { id: number; name: string }[];
  flags: { id: number; flag: string; team_id: number; team_name: string }[];
  user_score: number | null;
  global_average: number | null;
  top_scorer: {
    id: number;
    name: string;
    in_game_name: string | null;
    primary_role: string | null;
    profile_image_url: string | null;
    total_points: number;
    matches_played: number;
  } | null;
}

export interface GameweekHistoryPlayer {
  id: number;
  name: string;
  role: string;
  points: number;
  profileImageUrl: string | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface GameweekHistory {
  gameweek: { id: number; number: number };
  managerScore: number | null;
  globalAverage: number | null;
  starters: GameweekHistoryPlayer[];
  bench: GameweekHistoryPlayer[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function parseHistoryPlayer(value: unknown): GameweekHistoryPlayer {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.name !== 'string' ||
    typeof value.role !== 'string' ||
    typeof value.points !== 'number' ||
    !Number.isFinite(value.points) ||
    !isNullableString(value.profileImageUrl) ||
    typeof value.isCaptain !== 'boolean' ||
    typeof value.isViceCaptain !== 'boolean'
  ) {
    throw new ApiError('Gameweek history was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    name: value.name,
    role: value.role,
    points: value.points,
    profileImageUrl: value.profileImageUrl,
    isCaptain: value.isCaptain,
    isViceCaptain: value.isViceCaptain,
  };
}

function parseGameweekHistory(value: unknown): GameweekHistory {
  if (
    !isRecord(value) ||
    !isRecord(value.gameweek) ||
    !Number.isInteger(value.gameweek.id) ||
    !Number.isInteger(value.gameweek.number) ||
    !isNullableNumber(value.managerScore) ||
    !isNullableNumber(value.globalAverage) ||
    !Array.isArray(value.starters) ||
    !Array.isArray(value.bench)
  ) {
    throw new ApiError('Gameweek history was returned in an unexpected format.', 502);
  }
  return {
    gameweek: {
      id: Number(value.gameweek.id),
      number: Number(value.gameweek.number),
    },
    managerScore: value.managerScore,
    globalAverage: value.globalAverage,
    starters: value.starters.map(parseHistoryPlayer),
    bench: value.bench.map(parseHistoryPlayer),
  };
}

function parseGameweek(value: unknown): GameweekSummary {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    !Number.isInteger(value.gameweek_number) ||
    !isNullableString(value.start_date) ||
    !isNullableString(value.end_date) ||
    !isNullableString(value.deadline) ||
    typeof value.status !== 'string' ||
    typeof value.match_count !== 'number' ||
    !Array.isArray(value.tournaments) ||
    !Array.isArray(value.flags) ||
    !isNullableNumber(value.user_score) ||
    !isNullableNumber(value.global_average)
  ) {
    throw new ApiError('Gameweek data was returned in an unexpected format.', 502);
  }

  const tournaments = value.tournaments.map((tournament) => {
    if (
      !isRecord(tournament) ||
      !Number.isInteger(tournament.id) ||
      typeof tournament.name !== 'string'
    ) {
      throw new ApiError('Gameweek data was returned in an unexpected format.', 502);
    }
    return { id: Number(tournament.id), name: tournament.name };
  });
  const flags = value.flags.map((flag) => {
    if (
      !isRecord(flag) ||
      !Number.isInteger(flag.id) ||
      typeof flag.flag !== 'string' ||
      !Number.isInteger(flag.team_id) ||
      typeof flag.team_name !== 'string'
    ) {
      throw new ApiError('Gameweek data was returned in an unexpected format.', 502);
    }
    return {
      id: Number(flag.id),
      flag: flag.flag,
      team_id: Number(flag.team_id),
      team_name: flag.team_name,
    };
  });

  let topScorer: GameweekSummary['top_scorer'] = null;
  if (value.top_scorer !== null) {
    if (
      !isRecord(value.top_scorer) ||
      !Number.isInteger(value.top_scorer.id) ||
      typeof value.top_scorer.name !== 'string' ||
      !isNullableNumber(value.top_scorer.total_points) ||
      !isNullableString(value.top_scorer.primary_role ?? null) ||
      !isNullableString(value.top_scorer.profile_image_url ?? null) ||
      !Number.isInteger(value.top_scorer.matches_played)
    ) {
      throw new ApiError('Gameweek data was returned in an unexpected format.', 502);
    }
    topScorer = {
      id: Number(value.top_scorer.id),
      name: value.top_scorer.name,
      in_game_name: typeof value.top_scorer.in_game_name === 'string'
        ? value.top_scorer.in_game_name
        : null,
      primary_role: typeof value.top_scorer.primary_role === 'string'
        ? value.top_scorer.primary_role
        : null,
      profile_image_url: typeof value.top_scorer.profile_image_url === 'string'
        ? value.top_scorer.profile_image_url
        : null,
      total_points: value.top_scorer.total_points ?? 0,
      matches_played: Number(value.top_scorer.matches_played),
    };
  }

  return {
    id: Number(value.id),
    gameweek_number: Number(value.gameweek_number),
    start_date: value.start_date,
    end_date: value.end_date,
    deadline: value.deadline,
    status: value.status,
    match_count: value.match_count,
    tournaments,
    flags,
    user_score: value.user_score,
    global_average: value.global_average,
    top_scorer: topScorer,
  };
}

export async function getGameweeks(): Promise<GameweekSummary[]> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_gameweeks');
  if (error) throw new ApiError(`Unable to load gameweeks: ${error.message}`, 500);
  if (!isRecord(result) || !Array.isArray(result.gameweeks)) {
    throw new ApiError('Gameweek data was returned in an unexpected format.', 502);
  }
  return result.gameweeks.map(parseGameweek);
}

export async function getGameweekHistory(gameweekId: number): Promise<GameweekHistory> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_gameweek_history', {
    p_gameweek_id: gameweekId,
  });
  if (error) throw new ApiError(`Unable to load gameweek history: ${error.message}`, 500);
  return parseGameweekHistory(result);
}
