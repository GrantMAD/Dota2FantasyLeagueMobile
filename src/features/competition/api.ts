import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

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

export interface MatchCounts {
  all: number;
  live: number;
  upcoming: number;
  completed: number;
}

export interface MatchPage {
  matches: MatchSummary[];
  total: number;
  page: number;
  limit: number;
  counts: MatchCounts;
}

export interface MatchFilters {
  status?: string;
  gameweekId?: number;
  teamId?: number;
  tournamentId?: number;
  search?: string;
  page?: number;
  limit?: number;
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

export interface MatchDetails {
  match: MatchSummary;
  playerStats: MatchPlayerStat[];
  fantasyBreakdown: { player_id: number; total_points: number | null }[];
}

export interface MatchPlayerStat {
  id: number | string;
  player_id: number;
  team_id: number;
  hero_name: string | null;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_minute: number | null;
  experience_per_minute: number | null;
  hero_damage: number | null;
  player: { id: number; name: string; in_game_name: string | null } | null;
}

export interface TournamentDetails {
  tournament: { id: number; name: string; tier: string | null };
  matches: MatchSummary[];
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

function nullableFiniteNumber(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || (typeof value === 'number' && Number.isFinite(value));
}

function parseStatPlayer(value: unknown): MatchPlayerStat['player'] {
  if (value === null || value === undefined) return null;
  if (
    !isRecord(value) ||
    !((typeof value.id === 'number' || typeof value.id === 'string') && Number.isInteger(Number(value.id))) ||
    typeof value.name !== 'string' ||
    !nullableString(value.in_game_name)
  ) {
    throw new ApiError('Match player statistics were returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    name: value.name,
    in_game_name: value.in_game_name,
  };
}

function parseTeam(value: unknown): MatchSummary['radiant_team'] {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new ApiError('Match data was returned in an unexpected format.', 502);
  }
  return {
    name: value.name,
    tag: getTeamTag(value.name),
  };
}

function getTeamTag(name: string): string {
  const normalized = name.trim();
  if (/^\d+$/.test(normalized)) return `T${normalized.slice(-2)}`;
  if (normalized.length <= 3) return normalized.toUpperCase();
  const tokens = normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 3);
  return tokens.length > 1
    ? tokens.map((part) => part[0].toUpperCase()).join('')
    : normalized.slice(0, 3).toUpperCase();
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
    status: value.status === 'in_progress' ? 'live' : value.status,
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
  return getMatchesByFilters({ status });
}

export async function getMatchesPage(filters: MatchFilters = {}): Promise<MatchPage> {
  const status = filters.status ?? 'all';
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 24;
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_matches', {
    p_status: status === 'all' ? null : status === 'upcoming' ? 'scheduled' : status === 'live' ? 'in_progress' : status,
    p_gameweek_id: filters.gameweekId ?? null,
    p_team_id: filters.teamId ?? null,
    p_tournament_id: filters.tournamentId ?? null,
    p_search: filters.search?.trim() || null,
    p_page: page,
    p_limit: limit,
  });
  if (error) throw new ApiError(`Unable to load matches: ${error.message}`, 500);
  if (
    !isRecord(result) ||
    !Array.isArray(result.matches) ||
    !Number.isInteger(result.total) ||
    !Number.isInteger(result.page) ||
    !Number.isInteger(result.limit) ||
    !isRecord(result.counts) ||
    !Number.isInteger(result.counts.all) ||
    !Number.isInteger(result.counts.live) ||
    !Number.isInteger(result.counts.upcoming) ||
    !Number.isInteger(result.counts.completed)
  ) {
    throw new ApiError('Match data was returned in an unexpected format.', 502);
  }
  return {
    matches: result.matches.map(parseMatch),
    total: Number(result.total),
    page: Number(result.page),
    limit: Number(result.limit),
    counts: {
      all: Number(result.counts.all),
      live: Number(result.counts.live),
      upcoming: Number(result.counts.upcoming),
      completed: Number(result.counts.completed),
    },
  };
}

export async function getMatchesByFilters(filters: MatchFilters): Promise<MatchSummary[]> {
  const result = await getMatchesPage({ ...filters, page: 1, limit: 100 });
  return result.matches;
}

export async function getMatchDetails(id: number): Promise<MatchDetails> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_match_details', {
    p_match_id: id,
  });
  if (error) throw new ApiError(`Unable to load match details: ${error.message}`, 500);
  if (
    !isRecord(result) ||
    !Array.isArray(result.playerStats) ||
    !Array.isArray(result.fantasyBreakdown) ||
    !isRecord(result.match)
  ) {
    throw new ApiError('Match data was returned in an unexpected format.', 502);
  }
  const playerStats = result.playerStats.map((row): MatchPlayerStat => {
    if (
      !isRecord(row) ||
      !(Number.isInteger(row.id) || typeof row.id === 'string') ||
      !Number.isInteger(row.player_id) ||
      !Number.isInteger(row.team_id) ||
      !nullableString(row.hero_name) ||
      typeof row.kills !== 'number' ||
      !Number.isFinite(row.kills) ||
      typeof row.deaths !== 'number' ||
      !Number.isFinite(row.deaths) ||
      typeof row.assists !== 'number' ||
      !Number.isFinite(row.assists) ||
      !nullableFiniteNumber(row.gold_per_minute) ||
      !nullableFiniteNumber(row.experience_per_minute) ||
      !nullableFiniteNumber(row.hero_damage)
    ) {
      throw new ApiError('Match player statistics were returned in an unexpected format.', 502);
    }

    const rawPlayer = row.professional_players;
    const playerValue = Array.isArray(rawPlayer) ? rawPlayer[0] ?? null : rawPlayer ?? null;
    if (Array.isArray(rawPlayer) && rawPlayer.length > 1) {
      throw new ApiError('Match player statistics were returned in an unexpected format.', 502);
    }

    return {
      id: typeof row.id === 'string' ? row.id : Number(row.id),
      player_id: Number(row.player_id),
      team_id: Number(row.team_id),
      hero_name: row.hero_name,
      kills: row.kills,
      deaths: row.deaths,
      assists: row.assists,
      gold_per_minute: typeof row.gold_per_minute === 'number' ? row.gold_per_minute : null,
      experience_per_minute: typeof row.experience_per_minute === 'number'
        ? row.experience_per_minute
        : null,
      hero_damage: typeof row.hero_damage === 'number' ? row.hero_damage : null,
      player: parseStatPlayer(playerValue),
    };
  });
  const fantasyBreakdown = result.fantasyBreakdown.map((row) => {
    if (
      !isRecord(row) ||
      !Number.isInteger(row.player_id) ||
      !(row.total_points === null || typeof row.total_points === 'number')
    ) {
      throw new ApiError('Match data was returned in an unexpected format.', 502);
    }
    return { player_id: Number(row.player_id), total_points: row.total_points };
  });
  return {
    match: parseMatch(result.match),
    playerStats,
    fantasyBreakdown,
  };
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
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_tournaments');
  if (error) throw new ApiError(`Unable to load tournaments: ${error.message}`, 500);
  if (!isRecord(result) || !Array.isArray(result.tournaments)) {
    throw new ApiError('Tournament data was returned in an unexpected format.', 502);
  }
  return result.tournaments.map(parseTournament);
}

export async function getTournamentDetails(id: number): Promise<TournamentDetails> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_tournament_details', {
    p_tournament_id: id,
  });
  if (error) throw new ApiError(`Unable to load tournament details: ${error.message}`, 500);
  if (!isRecord(result) || !isRecord(result.tournament) || !Array.isArray(result.matches)) {
    throw new ApiError('Tournament data was returned in an unexpected format.', 502);
  }
  const tournament = result.tournament;
  if (
    !Number.isInteger(tournament.id) ||
    typeof tournament.name !== 'string' ||
    !nullableString(tournament.tier)
  ) {
    throw new ApiError('Tournament data was returned in an unexpected format.', 502);
  }
  return {
    tournament: {
      id: Number(tournament.id),
      name: tournament.name,
      tier: tournament.tier,
    },
    matches: result.matches.map(parseMatch),
  };
}
