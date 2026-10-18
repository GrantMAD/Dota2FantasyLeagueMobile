import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface LeagueStanding {
  userId: string;
  manager: string;
  points: number;
  gameweekPoints: number;
  rank: number | null;
  wins: number;
  losses: number;
  draws: number;
}

export interface LeagueFixture {
  id: number;
  gameweekId: number;
  home: string;
  away: string;
  homePoints: number;
  awayPoints: number;
  winnerId: number | null;
  isBye: boolean;
}

export interface LeagueSummary {
  id: number;
  name: string;
  type: 'classic' | 'h2h';
  privacyLevel: 'public' | 'private';
  description: string;
  maxParticipants: number;
  currentParticipants: number;
  inviteCode: string;
  status: string;
  createdAt: string;
  standings: LeagueStanding[];
  fixtures: LeagueFixture[];
}

export interface LeagueActivity {
  id: number;
  type: 'transfer' | 'captain_pick' | 'rank_change';
  createdAt: string;
  manager: string;
  gameweekNumber: number | null;
  fromRank: number | null;
  toRank: number | null;
  playersIn: string[];
  playersOut: string[];
  captain: string | null;
  viceCaptain: string | null;
}

export interface CreateLeagueInput {
  name: string;
  description: string;
  type: 'classic' | 'h2h';
  privacyLevel: 'public' | 'private';
  maxParticipants: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseLeague(value: unknown): LeagueSummary {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.name !== 'string' ||
    (value.type !== 'classic' && value.type !== 'h2h') ||
    (value.privacyLevel !== 'public' && value.privacyLevel !== 'private') ||
    typeof value.description !== 'string' ||
    !Number.isInteger(value.maxParticipants) ||
    !Number.isInteger(value.currentParticipants) ||
    typeof value.inviteCode !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.createdAt !== 'string' ||
    !Array.isArray(value.standings) ||
    !Array.isArray(value.fixtures)
  ) {
    throw new ApiError('League data was returned in an unexpected format.', 502);
  }

  const standings = value.standings.map((standing): LeagueStanding => {
    if (
      !isRecord(standing) ||
      typeof standing.userId !== 'string' ||
      typeof standing.manager !== 'string' ||
      !isFiniteNumber(standing.points) ||
      !isFiniteNumber(standing.gwPoints) ||
      !(standing.rank === null || Number.isInteger(standing.rank)) ||
      !isFiniteNumber(standing.wins) ||
      !isFiniteNumber(standing.losses) ||
      !isFiniteNumber(standing.draws)
    ) {
      throw new ApiError('League standings were returned in an unexpected format.', 502);
    }
    return {
      userId: standing.userId,
      manager: standing.manager,
      points: standing.points,
      gameweekPoints: standing.gwPoints,
      rank: standing.rank === null ? null : Number(standing.rank),
      wins: standing.wins,
      losses: standing.losses,
      draws: standing.draws,
    };
  });

  const fixtures = value.fixtures.map((fixture): LeagueFixture => {
    if (
      !isRecord(fixture) ||
      !Number.isInteger(fixture.id) ||
      !Number.isInteger(fixture.gameweekId) ||
      typeof fixture.home !== 'string' ||
      typeof fixture.away !== 'string' ||
      !isFiniteNumber(fixture.homePoints) ||
      !isFiniteNumber(fixture.awayPoints) ||
      !(fixture.winnerId === null || Number.isInteger(fixture.winnerId)) ||
      typeof fixture.isBye !== 'boolean'
    ) {
      throw new ApiError('League fixtures were returned in an unexpected format.', 502);
    }
    return {
      id: Number(fixture.id),
      gameweekId: Number(fixture.gameweekId),
      home: fixture.home,
      away: fixture.away,
      homePoints: fixture.homePoints,
      awayPoints: fixture.awayPoints,
      winnerId: fixture.winnerId === null ? null : Number(fixture.winnerId),
      isBye: fixture.isBye,
    };
  });

  return {
    id: Number(value.id),
    name: value.name,
    type: value.type,
    privacyLevel: value.privacyLevel,
    description: value.description,
    maxParticipants: Number(value.maxParticipants),
    currentParticipants: Number(value.currentParticipants),
    inviteCode: value.inviteCode,
    status: value.status,
    createdAt: value.createdAt,
    standings,
    fixtures,
  };
}

export async function getLeagues(): Promise<LeagueSummary[]> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_leagues');
  if (error) throw new ApiError(`Unable to load leagues: ${error.message}`, 500);
  if (!isRecord(result) || !Array.isArray(result.leagues)) {
    throw new ApiError('League data was returned in an unexpected format.', 502);
  }
  return result.leagues.map(parseLeague);
}

async function submitLeagueRequest(body: CreateLeagueInput | { action: 'join'; inviteCode: string }) {
  const isJoin = 'action' in body;
  const { data: result, error } = isJoin
    ? await getSupabaseClient().rpc('mobile_join_league', {
        p_invite_code: body.inviteCode,
      })
    : await getSupabaseClient().rpc('mobile_create_league', {
        p_name: body.name,
        p_description: body.description,
        p_type: body.type,
        p_privacy_level: body.privacyLevel,
        p_max_participants: body.maxParticipants,
      });
  if (error) throw new ApiError(`Unable to complete league request: ${error.message}`, 400);
  if (
    !isRecord(result) ||
    !isRecord(result.data) ||
    !Number.isInteger(result.data.id) ||
    typeof result.data.name !== 'string'
  ) {
    throw new ApiError('The league request returned an unexpected response.', 502);
  }
  return {
    id: Number(result.data.id),
    name: result.data.name,
    message: typeof result.message === 'string' ? result.message : 'League request completed.',
  };
}

export function createLeague(input: CreateLeagueInput) {
  return submitLeagueRequest(input);
}

export function joinLeague(inviteCode: string) {
  return submitLeagueRequest({ action: 'join', inviteCode: inviteCode.trim().toUpperCase() });
}

export async function getLeague(leagueId: number): Promise<LeagueSummary | null> {
  const leagues = await getLeagues();
  return leagues.find((league) => league.id === leagueId) ?? null;
}

export async function getLeagueActivity(leagueId: number): Promise<LeagueActivity[]> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_league_activity', {
    p_league_id: leagueId,
    p_limit: 50,
  });
  if (error) throw new ApiError(`Unable to load league activity: ${error.message}`, 500);
  if (!isRecord(result) || !Array.isArray(result.activities)) {
    throw new ApiError('League activity was returned in an unexpected format.', 502);
  }

  return result.activities.map((activity): LeagueActivity => {
    if (
      !isRecord(activity) ||
      !Number.isSafeInteger(activity.id) ||
      (activity.type !== 'transfer' && activity.type !== 'captain_pick' && activity.type !== 'rank_change') ||
      typeof activity.createdAt !== 'string' ||
      typeof activity.manager !== 'string' ||
      !(activity.gameweekNumber === null || Number.isInteger(activity.gameweekNumber)) ||
      !(activity.fromRank === null || Number.isInteger(activity.fromRank)) ||
      !(activity.toRank === null || Number.isInteger(activity.toRank)) ||
      !Array.isArray(activity.playersIn) ||
      !activity.playersIn.every((player) => typeof player === 'string') ||
      !Array.isArray(activity.playersOut) ||
      !activity.playersOut.every((player) => typeof player === 'string') ||
      !(activity.captain === null || typeof activity.captain === 'string') ||
      !(activity.viceCaptain === null || typeof activity.viceCaptain === 'string')
    ) {
      throw new ApiError('League activity entry was returned in an unexpected format.', 502);
    }
    return {
      id: Number(activity.id),
      type: activity.type,
      createdAt: activity.createdAt,
      manager: activity.manager,
      gameweekNumber: activity.gameweekNumber === null ? null : Number(activity.gameweekNumber),
      fromRank: activity.fromRank === null ? null : Number(activity.fromRank),
      toRank: activity.toRank === null ? null : Number(activity.toRank),
      playersIn: activity.playersIn,
      playersOut: activity.playersOut,
      captain: activity.captain,
      viceCaptain: activity.viceCaptain,
    };
  });
}
