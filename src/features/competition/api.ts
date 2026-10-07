import { ApiError, apiFetch } from '@/src/lib/api';

export interface MatchSummary {
  id: number;
  status: string;
  scheduled_at: string;
  gameweek_id: number | null;
  match_number: number;
  best_of: number;
  radiant_team_id: number | null;
  dire_team_id: number | null;
  radiant_team: { name: string; tag: string } | null;
  dire_team: { name: string; tag: string } | null;
  tournament: { id: number; name: string; tier: string | null } | null;
}

export interface TournamentSummary {
  id: number;
  name: string;
  slug: string;
  status: string;
  tier: string | null;
  start_date: string | null;
  end_date: string | null;
  eligible: boolean;
  series_count: number;
  participating_teams: { id: number; name: string }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseTeam(value: unknown): MatchSummary['radiant_team'] {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new ApiError('Match data was returned in an unexpected format.', 502);
  }
  return {
    name: value.name,
    tag: typeof value.tag === 'string' ? value.tag : value.name.slice(0, 4).toUpperCase(),
  };
}

function parseMatch(value: unknown): MatchSummary {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.status !== 'string' ||
    typeof value.scheduled_at !== 'string' ||
    !nullableNumber(value.gameweek_id) ||
    typeof value.match_number !== 'number' ||
    typeof value.best_of !== 'number' ||
    !nullableNumber(value.radiant_team_id) ||
    !nullableNumber(value.dire_team_id)
  ) {
    throw new ApiError('Match data was returned in an unexpected format.', 502);
  }
  const rawTournament = value.tournaments;
  if (
    rawTournament !== null &&
    rawTournament !== undefined &&
    (!isRecord(rawTournament) ||
      !Number.isInteger(rawTournament.id) ||
      typeof rawTournament.name !== 'string' ||
      !nullableString(rawTournament.tier))
  ) {
    throw new ApiError('Match data was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    status: value.status,
    scheduled_at: value.scheduled_at,
    gameweek_id: value.gameweek_id,
    match_number: value.match_number,
    best_of: value.best_of,
    radiant_team_id: value.radiant_team_id,
    dire_team_id: value.dire_team_id,
    radiant_team: parseTeam(value.radiant_team),
    dire_team: parseTeam(value.dire_team),
    tournament: isRecord(rawTournament)
      ? {
          id: Number(rawTournament.id),
          name: String(rawTournament.name),
          tier: typeof rawTournament.tier === 'string' ? rawTournament.tier : null,
        }
      : null,
  };
}

export async function getMatches(status: string): Promise<MatchSummary[]> {
  const params = new URLSearchParams({ limit: '100', order: 'asc' });
  if (status !== 'all') {
    params.set('status', status === 'upcoming' ? 'scheduled' : status);
  }
  const result = await apiFetch<unknown>(`/api/matches?${params.toString()}`);
  if (!isRecord(result) || !Array.isArray(result.matches)) {
    throw new ApiError('Match data was returned in an unexpected format.', 502);
  }
  const now = Date.now();
  return result.matches
    .map(parseMatch)
    .filter((match) => status !== 'upcoming' || new Date(match.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
}

function parseTournament(value: unknown): TournamentSummary {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.name !== 'string' ||
    typeof value.slug !== 'string' ||
    typeof value.status !== 'string' ||
    !nullableString(value.tier) ||
    !nullableString(value.start_date) ||
    !nullableString(value.end_date) ||
    typeof value.eligible !== 'boolean' ||
    typeof value.series_count !== 'number' ||
    !Array.isArray(value.participating_teams)
  ) {
    throw new ApiError('Tournament data was returned in an unexpected format.', 502);
  }
  const participatingTeams = value.participating_teams.map((team) => {
    if (!isRecord(team) || !Number.isInteger(team.id) || typeof team.name !== 'string') {
      throw new ApiError('Tournament data was returned in an unexpected format.', 502);
    }
    return { id: Number(team.id), name: team.name };
  });
  return {
    id: Number(value.id),
    name: value.name,
    slug: value.slug,
    status: value.status,
    tier: value.tier,
    start_date: value.start_date,
    end_date: value.end_date,
    eligible: value.eligible,
    series_count: value.series_count,
    participating_teams: participatingTeams,
  };
}

export async function getTournaments(): Promise<TournamentSummary[]> {
  const result = await apiFetch<unknown>('/api/tournaments');
  if (!isRecord(result) || !Array.isArray(result.tournaments)) {
    throw new ApiError('Tournament data was returned in an unexpected format.', 502);
  }
  return result.tournaments.map(parseTournament);
}
