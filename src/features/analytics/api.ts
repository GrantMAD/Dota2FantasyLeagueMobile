import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface AnalyticsTrend {
  gameweekId: number;
  userScore: number;
  globalAverage: number;
}

export interface AnalyticsRole {
  role: string;
  points: number;
}

export interface AnalyticsCaptainEfficiency {
  captainPoints: number;
  idealCapPoints: number;
  efficiency: number;
}

export interface AnalyticsPlayer {
  playerName: string;
  team: string;
  role: string;
  points: number;
}

export interface AnalyticsMarketPlayer {
  playerName: string;
  team: string;
  role: string;
  ownership: number;
  price: number;
  roi: number;
}

export interface ManagerAnalytics {
  user: {
    totalPoints: number;
    globalRank: number | null;
    budget: number;
    squadValue: number;
    freeTransfers: number;
  };
  trend: AnalyticsTrend[];
  roleBreakdown: AnalyticsRole[];
  captainEfficiency: AnalyticsCaptainEfficiency;
  market: AnalyticsMarketPlayer[];
  dreamTeam: AnalyticsPlayer[];
  valueForMoney: AnalyticsMarketPlayer[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function parseAnalyticsPlayer(value: unknown): AnalyticsPlayer {
  if (
    !isRecord(value) ||
    typeof value.playerName !== 'string' ||
    typeof value.team !== 'string' ||
    typeof value.role !== 'string' ||
    !isNumber(value.points)
  ) {
    throw new ApiError('Player analytics were returned in an unexpected format.', 502);
  }
  return {
    playerName: value.playerName,
    team: value.team,
    role: value.role,
    points: value.points,
  };
}

function parseMarketPlayer(value: unknown): AnalyticsMarketPlayer {
  if (
    !isRecord(value) ||
    typeof value.playerName !== 'string' ||
    typeof value.team !== 'string' ||
    typeof value.role !== 'string' ||
    !isNumber(value.ownership) ||
    !isNumber(value.price) ||
    !isNumber(value.roi)
  ) {
    throw new ApiError('Market analytics were returned in an unexpected format.', 502);
  }
  return {
    playerName: value.playerName,
    team: value.team,
    role: value.role,
    ownership: value.ownership,
    price: value.price,
    roi: value.roi,
  };
}

export async function getAnalytics(): Promise<ManagerAnalytics> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_analytics');
  if (error) throw new ApiError(`Unable to load analytics: ${error.message}`, 500);
  if (
    !isRecord(result) ||
    !isRecord(result.user) ||
    !isNumber(result.user.totalPoints) ||
    !isNullableNumber(result.user.globalRank) ||
    !isNumber(result.user.budget) ||
    !isNumber(result.user.squadValue) ||
    !isNumber(result.user.freeTransfers) ||
    !Array.isArray(result.trend) ||
    !Array.isArray(result.roleBreakdown) ||
    !isRecord(result.captainEfficiency) ||
    !isNumber(result.captainEfficiency.captainPoints) ||
    !isNumber(result.captainEfficiency.idealCapPoints) ||
    !isNumber(result.captainEfficiency.efficiency) ||
    !Array.isArray(result.market) ||
    !Array.isArray(result.dreamTeam) ||
    !Array.isArray(result.valueForMoney)
  ) {
    throw new ApiError('Analytics were returned in an unexpected format.', 502);
  }

  const trend = result.trend.map((item): AnalyticsTrend => {
    if (
      !isRecord(item) ||
      !Number.isInteger(item.gameweekId) ||
      !isNumber(item.userScore) ||
      !isNumber(item.globalAverage)
    ) {
      throw new ApiError('Score trends were returned in an unexpected format.', 502);
    }
    return {
      gameweekId: Number(item.gameweekId),
      userScore: item.userScore,
      globalAverage: item.globalAverage,
    };
  });
  const roleBreakdown = result.roleBreakdown.map((item): AnalyticsRole => {
    if (!isRecord(item) || typeof item.role !== 'string' || !isNumber(item.points)) {
      throw new ApiError('Role analytics were returned in an unexpected format.', 502);
    }
    return { role: item.role, points: item.points };
  });

  return {
    user: {
      totalPoints: result.user.totalPoints,
      globalRank: result.user.globalRank,
      budget: result.user.budget,
      squadValue: result.user.squadValue,
      freeTransfers: result.user.freeTransfers,
    },
    trend,
    roleBreakdown,
    captainEfficiency: {
      captainPoints: result.captainEfficiency.captainPoints,
      idealCapPoints: result.captainEfficiency.idealCapPoints,
      efficiency: result.captainEfficiency.efficiency,
    },
    market: result.market.map(parseMarketPlayer),
    dreamTeam: result.dreamTeam.map(parseAnalyticsPlayer),
    valueForMoney: result.valueForMoney.map(parseMarketPlayer),
  };
}
