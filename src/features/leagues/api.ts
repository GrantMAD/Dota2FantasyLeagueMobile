import { ApiError, apiFetch } from '@/src/lib/api';

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
  const result = await apiFetch<unknown>('/api/leagues');
  if (!isRecord(result) || !Array.isArray(result.leagues)) {
    throw new ApiError('League data was returned in an unexpected format.', 502);
  }
  return result.leagues.map(parseLeague);
}

async function submitLeagueRequest(body: CreateLeagueInput | { action: 'join'; inviteCode: string }) {
  const result = await apiFetch<unknown>('/api/leagues', {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
