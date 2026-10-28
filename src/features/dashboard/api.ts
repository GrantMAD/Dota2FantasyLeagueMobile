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

export interface MobileTransferRushPlayer {
  id: number;
  name: string;
  in_game_name: string | null;
  team_name: string | null;
  team_logo_url: string | null;
  role: string | null;
  current_price: number;
  transfer_count: number;
}

export interface MobileTransferRushPulse {
  id: string;
  type: 'milestone' | 'velocity' | 'swap';
  message: string;
  timestamp: string;
  highlight_player_name?: string;
}

export interface MobileTransferRushData {
  gameweek: {
    id: number;
    gameweek_number: number;
    deadline: string | null;
    status: string;
    is_locked: boolean;
    seconds_remaining: number;
  } | null;
  window_minutes: number;
  total_transfers_in_window: number;
  transfers_per_minute: number;
  top_transferred_in: MobileTransferRushPlayer[];
  top_transferred_out: MobileTransferRushPlayer[];
  activity_pulses: MobileTransferRushPulse[];
  is_rush_active: boolean;
}

function parseTransferRushPlayer(value: unknown): MobileTransferRushPlayer {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.name !== 'string') {
    throw new ApiError('Transfer rush player returned in an unexpected format.', 502);
  }
  return {
    id: value.id,
    name: value.name,
    in_game_name: typeof value.in_game_name === 'string' ? value.in_game_name : null,
    team_name: typeof value.team_name === 'string' ? value.team_name : null,
    team_logo_url: typeof value.team_logo_url === 'string' ? value.team_logo_url : null,
    role: typeof value.role === 'string' ? value.role : null,
    current_price: typeof value.current_price === 'number' ? value.current_price : 5.0,
    transfer_count: typeof value.transfer_count === 'number' ? value.transfer_count : 0,
  };
}

function parseTransferRushPulse(value: unknown): MobileTransferRushPulse {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.message !== 'string') {
    throw new ApiError('Transfer rush pulse returned in an unexpected format.', 502);
  }
  return {
    id: value.id,
    type: value.type === 'velocity' ? 'velocity' : value.type === 'swap' ? 'swap' : 'milestone',
    message: value.message,
    timestamp: typeof value.timestamp === 'string' ? value.timestamp : new Date().toISOString(),
    highlight_player_name:
      typeof value.highlight_player_name === 'string' ? value.highlight_player_name : undefined,
  };
}

export async function getTransferRush(windowMinutes = 60): Promise<MobileTransferRushData> {
  const { data: body, error } = await getSupabaseClient().rpc('mobile_get_transfer_rush', {
    p_window_minutes: windowMinutes,
  });

  if (error) {
    throw new ApiError(`Unable to load transfer rush: ${error.message}`, 500);
  }

  if (
    !isRecord(body) ||
    !Array.isArray(body.top_transferred_in) ||
    !Array.isArray(body.top_transferred_out) ||
    !Array.isArray(body.activity_pulses)
  ) {
    throw new ApiError('Transfer rush data was returned in an unexpected format.', 502);
  }

  let gameweek: MobileTransferRushData['gameweek'] = null;
  if (isRecord(body.gameweek)) {
    gameweek = {
      id: typeof body.gameweek.id === 'number' ? body.gameweek.id : 0,
      gameweek_number:
        typeof body.gameweek.gameweek_number === 'number' ? body.gameweek.gameweek_number : 1,
      deadline: typeof body.gameweek.deadline === 'string' ? body.gameweek.deadline : null,
      status: typeof body.gameweek.status === 'string' ? body.gameweek.status : 'upcoming',
      is_locked: Boolean(body.gameweek.is_locked),
      seconds_remaining:
        typeof body.gameweek.seconds_remaining === 'number' ? body.gameweek.seconds_remaining : 0,
    };
  }

  return {
    gameweek,
    window_minutes: typeof body.window_minutes === 'number' ? body.window_minutes : windowMinutes,
    total_transfers_in_window:
      typeof body.total_transfers_in_window === 'number' ? body.total_transfers_in_window : 0,
    transfers_per_minute:
      typeof body.transfers_per_minute === 'number' ? body.transfers_per_minute : 0,
    top_transferred_in: body.top_transferred_in.map(parseTransferRushPlayer),
    top_transferred_out: body.top_transferred_out.map(parseTransferRushPlayer),
    activity_pulses: body.activity_pulses.map(parseTransferRushPulse),
    is_rush_active: Boolean(body.is_rush_active),
  };
}
