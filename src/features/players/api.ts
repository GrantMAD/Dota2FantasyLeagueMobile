import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';
import { buildPlayerAnalytics, PlayerAnalytics } from '@/src/lib/player-analytics';

export interface DirectoryPlayer {
  id: number;
  name: string;
  in_game_name: string | null;
  primary_role: string | null;
  availability_status: string | null;
  current_price: number | null;
  ownership_percentage?: number | null;
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

export interface ProfessionalTeam {
  id: number;
  name: string;
  logo_url: string | null;
}

export interface PlayerPerformance {
  id: number;
  gameweek_id: number;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  total_points: number;
  price: number | null;
  score_breakdown?: PlayerScoreBreakdown | null;
  opponent_name?: string | null;
  is_win?: boolean | null;
  duration_minutes?: number | null;
  gold_per_minute?: number | null;
  experience_per_minute?: number | null;
  last_hits?: number | null;
  denies?: number | null;
  hero_damage?: number | null;
  building_damage?: number | null;
  healing?: number | null;
  wards_placed?: number | null;
  wards_destroyed?: number | null;
  tower_participation?: number | null;
  roshan_participation?: number | null;
}

export interface PlayerScoreBreakdown {
  combat: number;
  economy: number;
  objective: number;
  teamfight: number;
  win: number;
  series: number;
  performance: number;
  consistency: number;
  penalty: number;
  total: number;
}

export interface PlayerDetail extends DirectoryPlayer {
  country: string | null;
  ownership_percentage: number;
  total_season_points: number;
  last_gw_points: number;
  availability_reason: string | null;
  performances: PlayerPerformance[];
  analytics?: PlayerAnalytics;
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

const SCORE_BREAKDOWN_FIELDS = [
  'combat',
  'economy',
  'objective',
  'teamfight',
  'win',
  'series',
  'performance',
  'consistency',
  'penalty',
  'total',
] as const;

function parseScoreBreakdown(value: unknown): PlayerScoreBreakdown | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !SCORE_BREAKDOWN_FIELDS.every((field) =>
      typeof value[field] === 'number' && Number.isFinite(value[field])
    )
  ) {
    throw new ApiError('Player score breakdown data was returned in an unexpected format.', 502);
  }
  return {
    combat: Number(value.combat),
    economy: Number(value.economy),
    objective: Number(value.objective),
    teamfight: Number(value.teamfight),
    win: Number(value.win),
    series: Number(value.series),
    performance: Number(value.performance),
    consistency: Number(value.consistency),
    penalty: Number(value.penalty),
    total: Number(value.total),
  };
}

export function aggregateLatestGameweekScoreBreakdown(
  performances: PlayerPerformance[],
): { gameweekId: number; breakdown: PlayerScoreBreakdown } | null {
  const latestGameweekId = performances.reduce<number | null>(
    (latest, performance) => latest === null ? performance.gameweek_id : Math.max(latest, performance.gameweek_id),
    null,
  );
  if (latestGameweekId === null) return null;

  const latestGameweekPerformances = performances.filter(
    (performance) => performance.gameweek_id === latestGameweekId,
  );
  const scoreBreakdowns = latestGameweekPerformances.flatMap((performance) =>
    performance.score_breakdown ? [performance.score_breakdown] : []
  );
  if (scoreBreakdowns.length !== latestGameweekPerformances.length) return null;

  const breakdown = SCORE_BREAKDOWN_FIELDS.reduce((totals, field) => {
    totals[field] = scoreBreakdowns.reduce((total, score) => total + score[field], 0);
    return totals;
  }, {} as PlayerScoreBreakdown);
  return { gameweekId: latestGameweekId, breakdown };
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
    ownership_percentage: typeof value.ownership_percentage === 'number' ? value.ownership_percentage : null,
    gameweek_points: value.gameweek_points,
    recent_points: value.recent_points,
    team_name: isRecord(team) ? String(team.name) : null,
    profile_image_url: typeof value.profile_image_url === 'string' ? value.profile_image_url : null,
  };
}

export async function getPlayers(params: {
  search: string;
  role: string;
  teamId: number | null;
  availableOnly: boolean;
  offset: number;
  limit: number;
}): Promise<PlayerPage> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_players', {
    p_search: params.search.trim(),
    p_role: params.role,
    p_team_id: params.teamId,
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

export async function getProfessionalTeams(): Promise<ProfessionalTeam[]> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_professional_teams');
  if (error) throw new ApiError(`Unable to load professional teams: ${error.message}`, 500);
  if (!isRecord(result) || !Array.isArray(result.teams)) {
    throw new ApiError('Professional team data was returned in an unexpected format.', 502);
  }

  return result.teams.map((team): ProfessionalTeam => {
    if (
      !isRecord(team) ||
      !Number.isInteger(team.id) ||
      typeof team.name !== 'string' ||
      !(team.logo_url === null || typeof team.logo_url === 'string')
    ) {
      throw new ApiError('Professional team data was returned in an unexpected format.', 502);
    }
    return {
      id: Number(team.id),
      name: team.name,
      logo_url: typeof team.logo_url === 'string' ? team.logo_url : null,
    };
  });
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
    if (performance.price !== undefined && performance.price !== null && optionalStat(performance.price) === null) {
      throw new ApiError('Player performance price data was returned in an unexpected format.', 502);
    }
    const stringOrNull = (value: unknown): string | null =>
      typeof value === 'string' && value.trim() ? value.trim() : null;
    const booleanOrNull = (value: unknown): boolean | null =>
      typeof value === 'boolean' ? value : null;

    // Optional match details if returned by RPC/joins
    const matchData = isRecord(performance.matches) ? performance.matches : null;
    let opponentName: string | null = stringOrNull(performance.opponent_name);
    let isWin: boolean | null = booleanOrNull(performance.is_win);
    let durationMinutes: number | null = optionalStat(performance.duration_minutes);

    if (matchData) {
      if (!opponentName) {
        const teamA = isRecord(matchData.team_a) && typeof matchData.team_a.name === 'string' ? matchData.team_a.name : null;
        const teamB = isRecord(matchData.team_b) && typeof matchData.team_b.name === 'string' ? matchData.team_b.name : null;
        const teamAId = isRecord(matchData.team_a) && typeof matchData.team_a.id === 'number' ? matchData.team_a.id : null;
        const playerTeamId = isRecord(raw.professional_teams) && typeof raw.professional_teams.id === 'number' ? raw.professional_teams.id : null;
        opponentName = (playerTeamId && teamAId === playerTeamId) ? (teamB || 'Opponent') : (teamA || 'Opponent');
      }
      if (isWin === null && typeof matchData.winner_team_id === 'number') {
        const playerTeamId = isRecord(raw.professional_teams) && typeof raw.professional_teams.id === 'number' ? raw.professional_teams.id : null;
        if (playerTeamId) {
          isWin = matchData.winner_team_id === playerTeamId;
        }
      }
      if (durationMinutes === null) {
        durationMinutes = optionalStat(matchData.duration_minutes);
      }
    }

    return {
      id: Number(performance.id),
      gameweek_id: Number(performance.gameweek_id),
      kills: optionalStat(performance.kills),
      deaths: optionalStat(performance.deaths),
      assists: optionalStat(performance.assists),
      total_points: totalPoints,
      price: optionalStat(performance.price),
      score_breakdown: parseScoreBreakdown(performance.score_breakdown),
      opponent_name: opponentName,
      is_win: isWin,
      duration_minutes: durationMinutes,
      gold_per_minute: optionalStat(performance.gold_per_minute),
      experience_per_minute: optionalStat(performance.experience_per_minute),
      last_hits: optionalStat(performance.last_hits),
      denies: optionalStat(performance.denies),
      hero_damage: optionalStat(performance.hero_damage),
      building_damage: optionalStat(performance.building_damage),
      healing: optionalStat(performance.healing),
      wards_placed: optionalStat(performance.wards_placed),
      wards_destroyed: optionalStat(performance.wards_destroyed),
      tower_participation: optionalStat(performance.tower_participation),
      roshan_participation: optionalStat(performance.roshan_participation),
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
    analytics: buildPlayerAnalytics(
      [...performances]
        .sort((a, b) => a.gameweek_id - b.gameweek_id)
        .map((perf) => ({
          gameweekId: perf.gameweek_id,
          points: perf.total_points,
          price: perf.price,
        })),
      {
        role: directory.primary_role,
      }
    ),
  };
}
