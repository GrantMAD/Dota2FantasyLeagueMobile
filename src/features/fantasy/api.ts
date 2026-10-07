import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface FantasyPlayer {
  id: number;
  name: string;
  in_game_name: string | null;
  primary_role: string | null;
  professional_teams: {
    id: number;
    name: string;
    slug: string | null;
  } | null;
  availability_status: string | null;
  availability_reason: string | null;
  current_price: number;
  last_gw_points: number;
  recent_points: number;
}

export interface FantasyLineupEntry {
  slot: string;
  player_id: number;
  is_starter: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
  professional_players: FantasyPlayer | null;
}

export interface FantasyContext {
  fantasySeasonId: number | null;
  seasonId: number | null;
  budget: number;
  freeTransfers: number;
  totalPoints: number;
  globalRank: number | null;
  gameweek: {
    id: number;
    gameweekNumber: number;
    deadline: string | null;
    status: string;
    isLocked: boolean;
    hasUpcoming: boolean;
  } | null;
  chips: {
    tripleCaptainUsed: boolean;
    tripleCaptainGameweekId: number | null;
    benchBoostUsed: boolean;
    benchBoostGameweekId: number | null;
    wildcardUsed: boolean;
    wildcardUsedGameweekId: number | null;
  };
  lineup: FantasyLineupEntry[];
  ownedPlayers: FantasyPlayer[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function parsePlayer(value: unknown): FantasyPlayer {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.name !== 'string' ||
    typeof value.current_price !== 'number' ||
    typeof value.last_gw_points !== 'number' ||
    typeof value.recent_points !== 'number'
  ) {
    throw new ApiError('Fantasy data was returned in an unexpected format.', 502);
  }

  const rawTeam = value.professional_teams;
  const team = Array.isArray(rawTeam) ? rawTeam[0] ?? null : rawTeam;
  let professionalTeam: FantasyPlayer['professional_teams'] = null;
  if (team !== null && team !== undefined) {
    if (
      !isRecord(team) ||
      !Number.isInteger(team.id) ||
      typeof team.name !== 'string'
    ) {
      throw new ApiError('Fantasy data was returned in an unexpected format.', 502);
    }
    professionalTeam = {
      id: Number(team.id),
      name: team.name,
      slug: typeof team.slug === 'string' ? team.slug : null,
    };
  }

  return {
    id: value.id,
    name: value.name,
    in_game_name: typeof value.in_game_name === 'string' ? value.in_game_name : null,
    primary_role: typeof value.primary_role === 'string' ? value.primary_role : null,
    professional_teams: professionalTeam,
    availability_status: typeof value.availability_status === 'string' ? value.availability_status : null,
    availability_reason: typeof value.availability_reason === 'string' ? value.availability_reason : null,
    current_price: value.current_price,
    last_gw_points: value.last_gw_points,
    recent_points: value.recent_points,
  };
}

export interface TeamFixture {
  id: number;
  scheduled_time: string;
  team_a_id: number | null;
  team_b_id: number | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
  tournament_name: string | null;
}

function parseTeamFixture(value: unknown): TeamFixture {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.scheduled_time !== 'string' ||
    !isNullableNumber(value.team_a_id) ||
    !isNullableNumber(value.team_b_id)
  ) {
    throw new ApiError('Fixture data was returned in an unexpected format.', 502);
  }
  const radiant = value.radiant_team;
  const dire = value.dire_team;
  const tournament = value.tournaments;
  if (
    (radiant !== null && (!isRecord(radiant) || typeof radiant.name !== 'string')) ||
    (dire !== null && (!isRecord(dire) || typeof dire.name !== 'string')) ||
    (tournament !== null && (!isRecord(tournament) || typeof tournament.name !== 'string'))
  ) {
    throw new ApiError('Fixture data was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    scheduled_time: value.scheduled_time,
    team_a_id: value.team_a_id,
    team_b_id: value.team_b_id,
    team_a: isRecord(radiant) ? { name: String(radiant.name) } : null,
    team_b: isRecord(dire) ? { name: String(dire.name) } : null,
    tournament_name: isRecord(tournament) ? String(tournament.name) : null,
  };
}

export async function getUpcomingTeamFixtures(teamId: number): Promise<TeamFixture[]> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_matches', {
    p_status: 'scheduled',
    p_gameweek_id: null,
    p_team_id: teamId,
    p_tournament_id: null,
    p_limit: 100,
  });
  if (error) throw new ApiError(`Unable to load team fixtures: ${error.message}`, 500);
  if (!isRecord(result) || !Array.isArray(result.matches)) {
    throw new ApiError('Fixture data was returned in an unexpected format.', 502);
  }
  const now = Date.now();
  return result.matches
    .map(parseTeamFixture)
    .filter((match) => {
      const scheduled = new Date(match.scheduled_time).getTime();
      return Number.isFinite(scheduled) && scheduled >= now;
    })
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
}

function parseLineupEntry(value: unknown): FantasyLineupEntry {
  if (
    !isRecord(value) ||
    typeof value.slot !== 'string' ||
    typeof value.player_id !== 'number' ||
    typeof value.is_starter !== 'boolean' ||
    typeof value.is_captain !== 'boolean' ||
    typeof value.is_vice_captain !== 'boolean'
  ) {
    throw new ApiError('Fantasy data was returned in an unexpected format.', 502);
  }

  const player = value.professional_players;
  return {
    slot: value.slot,
    player_id: value.player_id,
    is_starter: value.is_starter,
    is_captain: value.is_captain,
    is_vice_captain: value.is_vice_captain,
    professional_players: player === null ? null : parsePlayer(player),
  };
}

export async function getFantasyContext(): Promise<FantasyContext> {
  const { data: value, error } = await getSupabaseClient().rpc('mobile_get_fantasy_context');
  if (error) {
    throw new ApiError(`Unable to load fantasy context: ${error.message}`, 500);
  }
  const chips = isRecord(value) ? value.chips : null;
  if (
    !isRecord(value) ||
    !isNullableNumber(value.fantasySeasonId) ||
    !isNullableNumber(value.seasonId) ||
    typeof value.budget !== 'number' ||
    typeof value.freeTransfers !== 'number' ||
    typeof value.totalPoints !== 'number' ||
    !isNullableNumber(value.globalRank) ||
    !Array.isArray(value.lineup) ||
    !Array.isArray(value.ownedPlayers) ||
    !isRecord(chips) ||
    typeof chips.tripleCaptainUsed !== 'boolean' ||
    !isNullableNumber(chips.tripleCaptainGameweekId) ||
    typeof chips.benchBoostUsed !== 'boolean' ||
    !isNullableNumber(chips.benchBoostGameweekId) ||
    typeof chips.wildcardUsed !== 'boolean' ||
    !isNullableNumber(chips.wildcardUsedGameweekId)
  ) {
    throw new ApiError('Fantasy data was returned in an unexpected format.', 502);
  }

  let gameweek: FantasyContext['gameweek'] = null;
  if (value.gameweek !== null) {
    if (
      !isRecord(value.gameweek) ||
      typeof value.gameweek.id !== 'number' ||
      typeof value.gameweek.gameweekNumber !== 'number' ||
      (value.gameweek.deadline !== null && typeof value.gameweek.deadline !== 'string') ||
      typeof value.gameweek.status !== 'string' ||
      typeof value.gameweek.isLocked !== 'boolean' ||
      typeof value.gameweek.hasUpcoming !== 'boolean'
    ) {
      throw new ApiError('Fantasy data was returned in an unexpected format.', 502);
    }

    gameweek = {
      id: value.gameweek.id,
      gameweekNumber: value.gameweek.gameweekNumber,
      deadline: value.gameweek.deadline,
      status: value.gameweek.status,
      isLocked: value.gameweek.isLocked,
      hasUpcoming: value.gameweek.hasUpcoming,
    };
  }

  return {
    fantasySeasonId: value.fantasySeasonId,
    seasonId: value.seasonId,
    budget: value.budget,
    freeTransfers: value.freeTransfers,
    totalPoints: value.totalPoints,
    globalRank: value.globalRank,
    gameweek,
    chips: {
      tripleCaptainUsed: chips.tripleCaptainUsed,
      tripleCaptainGameweekId: chips.tripleCaptainGameweekId,
      benchBoostUsed: chips.benchBoostUsed,
      benchBoostGameweekId: chips.benchBoostGameweekId,
      wildcardUsed: chips.wildcardUsed,
      wildcardUsedGameweekId: chips.wildcardUsedGameweekId,
    },
    lineup: value.lineup.map(parseLineupEntry),
    ownedPlayers: value.ownedPlayers.map(parsePlayer),
  };
}

export interface SaveLineupPayload {
  fantasySeasonId: number;
  gameweekId: number;
  lineup: {
    playerId: number;
    slot: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }[];
}

export async function saveLineup(payload: SaveLineupPayload): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc('mobile_save_lineup', {
    p_fantasy_season_id: payload.fantasySeasonId,
    p_gameweek_id: payload.gameweekId,
    p_lineup: payload.lineup,
  });
  if (error) throw new ApiError(`Unable to save lineup: ${error.message}`, 400);
  if (data !== true) throw new ApiError('Lineup could not be saved.', 502);
}

export async function addPlayersToSquad(payload: {
  fantasySeasonId: number;
  playerIds: number[];
}): Promise<{ budget: number; squadSize: number; squadMaxSize: number }> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_add_players_to_squad', {
    p_fantasy_season_id: payload.fantasySeasonId,
    p_player_ids: payload.playerIds,
  });
  if (error) throw new ApiError(`Unable to add players to your squad: ${error.message}`, 400);
  if (
    !isRecord(result) ||
    typeof result.budget !== 'number' ||
    typeof result.squadSize !== 'number' ||
    typeof result.squadMaxSize !== 'number'
  ) {
    throw new ApiError('Squad update result was returned in an unexpected format.', 502);
  }
  return {
    budget: result.budget,
    squadSize: result.squadSize,
    squadMaxSize: result.squadMaxSize,
  };
}

export interface MarketPlayer {
  id: number;
  name: string;
  in_game_name: string | null;
  primary_role: string | null;
  availability_status: string | null;
  current_price: number | null;
  recent_points: number | null;
}

export interface TransferHistoryEntry {
  id: number;
  createdAt: string;
  gameweekNumber: number | null;
  penaltyPoints: number | null;
  moves: { playerOut: string | null; playerIn: string | null }[];
}

function parseMarketPlayer(value: unknown): MarketPlayer {
  const currentPrice = isRecord(value) ? value.current_price : undefined;
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.name !== 'string' ||
    (currentPrice !== null &&
      (typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)))
  ) {
    throw new ApiError('Player market data was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    name: value.name,
    in_game_name: typeof value.in_game_name === 'string' ? value.in_game_name : null,
    primary_role: typeof value.primary_role === 'string' ? value.primary_role : null,
    availability_status: typeof value.availability_status === 'string' ? value.availability_status : null,
    current_price: currentPrice === null ? null : Number(currentPrice),
    recent_points: typeof value.recent_points === 'number' ? value.recent_points : null,
  };
}

export async function getPlayerMarket(search: string): Promise<MarketPlayer[]> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_player_market', {
    p_search: search.trim(),
    p_limit: 50,
  });
  if (error) throw new ApiError(`Unable to load the player market: ${error.message}`, 500);
  if (!isRecord(result) || !Array.isArray(result.data)) {
    throw new ApiError('Player market data was returned in an unexpected format.', 502);
  }
  return result.data.map(parseMarketPlayer);
}

export async function processTransfer(payload: {
  fantasySeasonId: number;
  transfersIn: number[];
  transfersOut: number[];
}): Promise<{ budget: number; freeTransfersRemaining: number; penaltyPoints: number }> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_process_fantasy_transfer', {
    p_fantasy_season_id: payload.fantasySeasonId,
    p_transfers_in: payload.transfersIn,
    p_transfers_out: payload.transfersOut,
  });
  if (error) throw new ApiError(`Unable to process transfer: ${error.message}`, 400);
  if (isRecord(result) && result.success === false && typeof result.message === 'string') {
    throw new ApiError(result.message, 400);
  }
  if (
    !isRecord(result) ||
    result.success !== true ||
    typeof result.budget !== 'number' ||
    typeof result.free_transfers_remaining !== 'number' ||
    typeof result.penalty_points !== 'number'
  ) {
    throw new ApiError('Transfer result was returned in an unexpected format.', 502);
  }
  return {
    budget: result.budget,
    freeTransfersRemaining: result.free_transfers_remaining,
    penaltyPoints: result.penalty_points,
  };
}

export async function activateWildcard(payload: {
  fantasySeasonId: number;
}): Promise<{ message: string; gameweekId: number | null }> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_activate_wildcard', {
    p_fantasy_season_id: payload.fantasySeasonId,
  });
  if (error) throw new ApiError(`Unable to activate Wildcard: ${error.message}`, 400);
  if (isRecord(result) && result.success === false && typeof result.message === 'string') {
    throw new ApiError(result.message, 400);
  }
  const gameweekId = isRecord(result) ? result.gameweekId ?? result.gameweek_id : undefined;
  if (
    !isRecord(result) ||
    result.success !== true ||
    typeof result.message !== 'string' ||
    !isNullableNumber(gameweekId)
  ) {
    throw new ApiError('Wildcard activation result was returned in an unexpected format.', 502);
  }
  return {
    message: result.message,
    gameweekId,
  };
}

export async function getTransferHistory(): Promise<TransferHistoryEntry[]> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_transfer_history', {
    p_limit: 100,
  });
  if (error) throw new ApiError(`Unable to load transfer history: ${error.message}`, 500);
  if (!isRecord(result) || !Array.isArray(result.transfers)) {
    throw new ApiError('Transfer history was returned in an unexpected format.', 502);
  }
  return result.transfers.map((entry): TransferHistoryEntry => {
    if (
      !isRecord(entry) ||
      !Number.isInteger(entry.id) ||
      typeof entry.createdAt !== 'string' ||
      !Array.isArray(entry.moves)
    ) {
      throw new ApiError('Transfer history was returned in an unexpected format.', 502);
    }
    return {
      id: Number(entry.id),
      createdAt: entry.createdAt,
      gameweekNumber: isNullableNumber(entry.gameweekNumber) ? entry.gameweekNumber : null,
      penaltyPoints: isNullableNumber(entry.penaltyPoints) ? entry.penaltyPoints : null,
      moves: entry.moves.map((move) => {
        if (!isRecord(move)) throw new ApiError('Transfer history was returned in an unexpected format.', 502);
        return {
          playerOut: typeof move.playerOut === 'string' ? move.playerOut : null,
          playerIn: typeof move.playerIn === 'string' ? move.playerIn : null,
        };
      }),
    };
  });
}

export async function activateChip(payload: {
  fantasySeasonId: number;
  chip: 'triple-captain' | 'bench-boost';
}): Promise<{ message: string; gameweekId: number | null }> {
  const functionName = payload.chip === 'triple-captain'
    ? 'mobile_activate_triple_captain'
    : 'mobile_activate_bench_boost';
  const { data: result, error } = await getSupabaseClient().rpc(functionName, {
    p_fantasy_season_id: payload.fantasySeasonId,
  });
  if (error) throw new ApiError(`Unable to activate ${payload.chip}: ${error.message}`, 400);
  if (isRecord(result) && result.success === false && typeof result.message === 'string') {
    throw new ApiError(result.message, 400);
  }
  const gameweekId = isRecord(result) ? result.gameweekId ?? result.gameweek_id : undefined;
  if (
    !isRecord(result) ||
    result.success !== true ||
    typeof result.message !== 'string' ||
    !isNullableNumber(gameweekId)
  ) {
    throw new ApiError('Chip activation result was returned in an unexpected format.', 502);
  }
  return {
    message: result.message,
    gameweekId,
  };
}
