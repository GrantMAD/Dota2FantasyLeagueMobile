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
  flags: { flag: string }[];
  user_score: number | null;
  top_scorer: {
    name: string;
    in_game_name: string | null;
    total_points: number;
  } | null;
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
    !isNullableNumber(value.user_score)
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
    if (!isRecord(flag) || typeof flag.flag !== 'string') {
      throw new ApiError('Gameweek data was returned in an unexpected format.', 502);
    }
    return { flag: flag.flag };
  });

  let topScorer: GameweekSummary['top_scorer'] = null;
  if (value.top_scorer !== null) {
    if (
      !isRecord(value.top_scorer) ||
      typeof value.top_scorer.name !== 'string' ||
      !isNullableNumber(value.top_scorer.total_points)
    ) {
      throw new ApiError('Gameweek data was returned in an unexpected format.', 502);
    }
    topScorer = {
      name: value.top_scorer.name,
      in_game_name: typeof value.top_scorer.in_game_name === 'string'
        ? value.top_scorer.in_game_name
        : null,
      total_points: value.top_scorer.total_points ?? 0,
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
