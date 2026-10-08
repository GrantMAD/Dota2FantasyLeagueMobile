import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface DashboardTournamentEvent {
  id: number;
  title: string;
  startedAt: string;
  tier: string | null;
  seriesCount: number;
  matchCount: number;
  bestOfFormats: number[];
}

export interface DashboardGameweek {
  id: number;
  number: number;
  status: string;
  startsAt: string;
  isCurrent: boolean;
  endsSoon: boolean;
  deadline: string;
  matchCount: number;
  matchStatuses: Record<string, number>;
}

export interface DashboardUpdate {
  id: number;
  playerId: number;
  kind: 'price_change' | 'availability';
  title: string;
  message: string;
  createdAt: string;
}

export interface DashboardWhatsNew {
  events: DashboardTournamentEvent[];
  gameweek: DashboardGameweek | null;
  updates: DashboardUpdate[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringNumberMap(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every(
    (count) => typeof count === 'number' && Number.isFinite(count),
  );
}

function parseEvent(value: unknown): DashboardTournamentEvent {
  if (
    !isRecord(value) ||
    value.kind !== 'tournament' ||
    !Number.isInteger(value.id) ||
    typeof value.title !== 'string' ||
    typeof value.startedAt !== 'string' ||
    !(value.tier === null || typeof value.tier === 'string') ||
    !Number.isInteger(value.seriesCount) ||
    !Number.isInteger(value.matchCount) ||
    !Array.isArray(value.bestOfFormats) ||
    !value.bestOfFormats.every((format) => Number.isInteger(format))
  ) {
    throw new ApiError('Dashboard event data was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    title: value.title,
    startedAt: value.startedAt,
    tier: value.tier,
    seriesCount: Number(value.seriesCount),
    matchCount: Number(value.matchCount),
    bestOfFormats: value.bestOfFormats.map((format) => Number(format)),
  };
}

function parseGameweek(value: unknown): DashboardGameweek {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    !Number.isInteger(value.number) ||
    typeof value.status !== 'string' ||
    typeof value.startsAt !== 'string' ||
    typeof value.isCurrent !== 'boolean' ||
    typeof value.endsSoon !== 'boolean' ||
    typeof value.deadline !== 'string' ||
    !Number.isInteger(value.matchCount) ||
    !isStringNumberMap(value.matchStatuses)
  ) {
    throw new ApiError('Dashboard gameweek data was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    number: Number(value.number),
    status: value.status,
    startsAt: value.startsAt,
    isCurrent: value.isCurrent,
    endsSoon: value.endsSoon,
    deadline: value.deadline,
    matchCount: Number(value.matchCount),
    matchStatuses: value.matchStatuses,
  };
}

function parseUpdate(value: unknown): DashboardUpdate {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    (value.kind !== 'price_change' && value.kind !== 'availability') ||
    typeof value.href !== 'string' ||
    !/^\/players\/[1-9]\d*$/.test(value.href) ||
    typeof value.title !== 'string' ||
    typeof value.message !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    throw new ApiError('Dashboard update data was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    playerId: Number(value.href.slice('/players/'.length)),
    kind: value.kind,
    title: value.title,
    message: value.message,
    createdAt: value.createdAt,
  };
}

export async function getDashboardWhatsNew(): Promise<DashboardWhatsNew> {
  const { data: body, error } = await getSupabaseClient().rpc('mobile_get_dashboard_whats_new');
  if (error) throw new ApiError(`Unable to load dashboard updates: ${error.message}`, 500);
  if (!isRecord(body) || !Array.isArray(body.events) || !Array.isArray(body.updates)) {
    throw new ApiError('Dashboard updates were returned in an unexpected format.', 502);
  }

  return {
    events: body.events.map(parseEvent),
    gameweek: body.gameweek === null ? null : parseGameweek(body.gameweek),
    updates: body.updates.map(parseUpdate),
  };
}
