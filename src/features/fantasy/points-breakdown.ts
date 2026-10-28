import { ApiError } from '@/src/lib/errors';

export const POINT_CATEGORIES = [
  ['combat', 'Combat'],
  ['economy', 'Economy'],
  ['objective', 'Objectives'],
  ['teamfight', 'Teamfights'],
  ['win', 'Wins'],
  ['series', 'Series'],
  ['performance', 'Performance index'],
  ['consistency', 'Consistency'],
  ['penalty', 'Penalties'],
] as const;

export type PointCategory = (typeof POINT_CATEGORIES)[number][0];

export interface PlayerPointCategories {
  combat: number;
  economy: number;
  objective: number;
  teamfight: number;
  win: number;
  series: number;
  performance: number;
  consistency: number;
  penalty: number;
}

export interface PointsContributor {
  playerId: number;
  name: string;
  role: string;
  basePoints: number;
  points: number;
  multiplier: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isAutoSub: boolean;
}

export interface GameweekPointsBreakdown {
  gameweekId: number;
  gameweekNumber: number;
  points: number;
  benchBoost: boolean;
  contributors: PointsContributor[];
  categories: PlayerPointCategories;
}

export interface DashboardPointsBreakdown {
  seasonName: string | null;
  totalPoints: number;
  categoryTotals: PlayerPointCategories;
  unitemizedPoints: number;
  gameweeks: GameweekPointsBreakdown[];
}

interface PointsLineup {
  gameweekId: number;
  gameweekNumber: number;
  totalPoints: number | null;
  slots: { playerId: number; role: string }[];
  benchIds: number[];
  captainPlayerId: number | null;
  viceCaptainPlayerId: number | null;
}

interface PointsPlayer {
  id: number;
  name: string | null;
  inGameName: string | null;
  primaryRole: string | null;
}

interface PointsPerformance {
  gameweekId: number;
  playerId: number;
  categories: PlayerPointCategories;
}

const CATEGORY_KEYS = POINT_CATEGORIES.map(([key]) => key);
const EMPTY_CATEGORIES = (): PlayerPointCategories => ({
  combat: 0,
  economy: 0,
  objective: 0,
  teamfight: 0,
  win: 0,
  series: 0,
  performance: 0,
  consistency: 0,
  penalty: 0,
});
const SLOT_ROLES = [
  ['Carry', 'carry_id'],
  ['Mid', 'mid_id'],
  ['Offlane', 'offlane_id'],
  ['Support', 'support_id'],
  ['Hard Support', 'hard_support_id'],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError(`Points breakdown returned an invalid ${field}.`, 502);
  }
  return value;
}

function readNullableNumber(value: unknown, field: string): number | null {
  return value === null ? null : readNumber(value, field);
}

function readCategories(value: unknown): PlayerPointCategories {
  if (!isRecord(value)) throw new ApiError('Points breakdown categories are invalid.', 502);
  const categories = EMPTY_CATEGORIES();
  for (const key of CATEGORY_KEYS) categories[key] = readNumber(value[key], key);
  return categories;
}

function parseLineup(value: unknown): PointsLineup {
  if (!isRecord(value)) throw new ApiError('Points breakdown lineup is invalid.', 502);
  const gameweekId = readNumber(value.id, 'gameweek id');
  const gameweekNumber = readNumber(value.gameweekNumber, 'gameweek number');
  const slots = SLOT_ROLES.flatMap(([role, column]) => {
    const playerId = readNullableNumber(value[column], column);
    return playerId === null ? [] : [{ playerId, role }];
  });
  const benchIds = ['bench_1_id', 'bench_2_id', 'bench_3_id']
    .map((key) => readNullableNumber(value[key], key))
    .filter((id): id is number => id !== null);
  return {
    gameweekId,
    gameweekNumber,
    totalPoints: readNullableNumber(value.total_points, 'gameweek points'),
    slots,
    benchIds,
    captainPlayerId: readNullableNumber(value.captain_player_id, 'captain id'),
    viceCaptainPlayerId: readNullableNumber(value.vice_captain_player_id, 'vice-captain id'),
  };
}

function roundPoints(points: number): number {
  return Math.round(points * 100) / 100;
}

function sumCategories(categories: PlayerPointCategories): number {
  return CATEGORY_KEYS.reduce((sum, key) => sum + categories[key], 0);
}

function roundCategories(categories: PlayerPointCategories): PlayerPointCategories {
  return {
    combat: roundPoints(categories.combat),
    economy: roundPoints(categories.economy),
    objective: roundPoints(categories.objective),
    teamfight: roundPoints(categories.teamfight),
    win: roundPoints(categories.win),
    series: roundPoints(categories.series),
    performance: roundPoints(categories.performance),
    consistency: roundPoints(categories.consistency),
    penalty: roundPoints(categories.penalty),
  };
}

export function parseDashboardPointsBreakdown(value: unknown): DashboardPointsBreakdown {
  if (!isRecord(value) || !Array.isArray(value.gameweeks) || !Array.isArray(value.players) || !Array.isArray(value.performances)) {
    throw new ApiError('Points breakdown was returned in an unexpected format.', 502);
  }

  const lineups = value.gameweeks.map(parseLineup);
  const players: PointsPlayer[] = value.players.map((player) => {
    if (!isRecord(player)) throw new ApiError('Points breakdown player is invalid.', 502);
    return {
      id: readNumber(player.id, 'player id'),
      name: typeof player.name === 'string' ? player.name : null,
      inGameName: typeof player.in_game_name === 'string' ? player.in_game_name : null,
      primaryRole: typeof player.primary_role === 'string' ? player.primary_role : null,
    };
  });
  const performances: PointsPerformance[] = value.performances.map((performance) => {
    if (!isRecord(performance)) throw new ApiError('Points breakdown performance is invalid.', 502);
    return {
      gameweekId: readNumber(performance.gameweek_id, 'performance gameweek id'),
      playerId: readNumber(performance.player_id, 'performance player id'),
      categories: readCategories(performance.categories),
    };
  });
  const playersById = new Map(players.map((player) => [player.id, player]));
  const performanceMap = new Map<number, Map<number, PlayerPointCategories>>();
  const participants = new Map<number, Set<number>>();

  for (const performance of performances) {
    let gameweekPerformances = performanceMap.get(performance.gameweekId);
    if (!gameweekPerformances) {
      gameweekPerformances = new Map();
      performanceMap.set(performance.gameweekId, gameweekPerformances);
    }
    const categories = gameweekPerformances.get(performance.playerId) ?? EMPTY_CATEGORIES();
    for (const key of CATEGORY_KEYS) categories[key] += performance.categories[key];
    gameweekPerformances.set(performance.playerId, categories);

    let gameweekParticipants = participants.get(performance.gameweekId);
    if (!gameweekParticipants) {
      gameweekParticipants = new Set();
      participants.set(performance.gameweekId, gameweekParticipants);
    }
    gameweekParticipants.add(performance.playerId);
  }

  const gameweeks = lineups.map((lineup): GameweekPointsBreakdown => {
    const played = participants.get(lineup.gameweekId) ?? new Set<number>();
    const benchRoles = new Map(lineup.benchIds.map((id) => [id, playersById.get(id)?.primaryRole ?? null]));
    const availableBench = lineup.benchIds.filter((id) => played.has(id));
    const usedBench = new Set<number>();
    const activeStarters: { playerId: number; role: string }[] = [];

    for (const slot of lineup.slots) {
      if (played.has(slot.playerId)) {
        activeStarters.push(slot);
        continue;
      }
      const substitute = availableBench.find((id) =>
        !usedBench.has(id) && benchRoles.get(id) === slot.role
      );
      if (substitute !== undefined) {
        usedBench.add(substitute);
        activeStarters.push({ playerId: substitute, role: slot.role });
      }
    }

    const allPlayerIds = [...lineup.slots.map(({ playerId }) => playerId), ...lineup.benchIds];
    const scoringPlayers = lineup.gameweekId === readNullableNumber(value.benchBoostGameweekId, 'Bench Boost gameweek id')
      ? allPlayerIds.map((playerId) => ({
          playerId,
          role: playersById.get(playerId)?.primaryRole ?? 'Bench',
        }))
      : activeStarters;
    const gameweekPerformances = performanceMap.get(lineup.gameweekId);
    const captainPlayed = lineup.captainPlayerId !== null && played.has(lineup.captainPlayerId);
    const categories = EMPTY_CATEGORIES();
    const contributors = new Map<number, PointsContributor>();

    for (const selected of scoringPlayers) {
      const player = playersById.get(selected.playerId);
      const playerCategories = gameweekPerformances?.get(selected.playerId) ?? EMPTY_CATEGORIES();
      const isCaptain = selected.playerId === lineup.captainPlayerId;
      const isViceCaptain = selected.playerId === lineup.viceCaptainPlayerId;
      const multiplier = isCaptain || (isViceCaptain && !captainPlayed)
        ? lineup.gameweekId === readNullableNumber(value.tripleCaptainGameweekId, 'Triple Captain gameweek id') ? 3 : 2
        : 1;
      const basePoints = sumCategories(playerCategories);
      const prior = contributors.get(selected.playerId);
      for (const key of CATEGORY_KEYS) categories[key] += playerCategories[key] * multiplier;
      contributors.set(selected.playerId, {
        playerId: selected.playerId,
        name: player?.inGameName || player?.name || `Player #${selected.playerId}`,
        role: selected.role,
        basePoints: (prior?.basePoints ?? 0) + basePoints,
        points: (prior?.points ?? 0) + basePoints * multiplier,
        multiplier: Math.max(prior?.multiplier ?? 1, multiplier),
        isCaptain: Boolean(prior?.isCaptain || isCaptain),
        isViceCaptain: Boolean(prior?.isViceCaptain || isViceCaptain),
        isAutoSub: Boolean(prior?.isAutoSub || usedBench.has(selected.playerId)),
      });
    }

    return {
      gameweekId: lineup.gameweekId,
      gameweekNumber: lineup.gameweekNumber,
      points: lineup.totalPoints ?? 0,
      benchBoost: lineup.gameweekId === readNullableNumber(value.benchBoostGameweekId, 'Bench Boost gameweek id'),
      contributors: [...contributors.values()]
        .map((contributor) => ({
          ...contributor,
          basePoints: roundPoints(contributor.basePoints),
          points: roundPoints(contributor.points),
        }))
        .sort((a, b) => b.points - a.points),
      categories: roundCategories(categories),
    };
  }).sort((a, b) => b.gameweekNumber - a.gameweekNumber);

  const categoryTotals = EMPTY_CATEGORIES();
  for (const gameweek of gameweeks) {
    for (const key of CATEGORY_KEYS) categoryTotals[key] += gameweek.categories[key];
  }
  for (const key of CATEGORY_KEYS) categoryTotals[key] = roundPoints(categoryTotals[key]);
  const totalPoints = readNumber(value.totalPoints, 'season total');
  const categorizedTotal = sumCategories(categoryTotals);

  return {
    seasonName: typeof value.seasonName === 'string' ? value.seasonName : null,
    totalPoints,
    categoryTotals,
    unitemizedPoints: roundPoints(totalPoints - categorizedTotal),
    gameweeks,
  };
}
