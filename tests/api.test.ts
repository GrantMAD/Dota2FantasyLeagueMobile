import type { Session } from '@supabase/supabase-js';
import { activateChip, activateWildcard, addPlayersToSquad, getFantasyContext, getPlayerMarket, getTransferHistory, getUpcomingTeamFixtures, processTransfer, saveLineup } from '../src/features/fantasy/api';
import { getSupabaseClient } from '../src/lib/supabase';
import { getGameweeks } from '../src/features/gameweeks/api';
import { getPlayerDetail, getPlayers, normalizePlayerComparisonIds } from '../src/features/players/api';
import {
  getMatchDetails,
  getMatches,
  getTournamentDetails,
  getTournaments,
} from '../src/features/competition/api';
import { createLeague, getLeagues, joinLeague } from '../src/features/leagues/api';
import { getLeaderboard } from '../src/features/leaderboard/api';
import { getAnalytics } from '../src/features/analytics/api';
import { getSeasonRecaps } from '../src/features/season-recap/api';
import {
  createManagerAccount,
  getManagerProfile,
  getThemePreference,
  registerPushToken,
  removePushToken,
  updateManagerProfile,
  updatePushNotificationPreference,
  updateThemePreference,
} from '../src/features/account/api';
import {
  clearReadNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  matchesNotificationCategory,
  notificationActionFor,
  notificationCategoryForType,
} from '../src/features/notifications/api';

process.env.EXPO_PUBLIC_WEB_URL = 'https://web.example.test';
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.example.test';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

const session: Session = {
  access_token: 'test-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'test-refresh-token',
  user: {
    id: 'test-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

describe('mobile data access', () => {
  const supabase = getSupabaseClient();
  let getSession: jest.SpyInstance;
  let refreshSession: jest.SpyInstance;
  let signUp: jest.SpyInstance;
  let mobileFantasyContextRpc: jest.SpyInstance;

  beforeEach(() => {
    getSession = jest.spyOn(supabase.auth, 'getSession');
    refreshSession = jest.spyOn(supabase.auth, 'refreshSession');
    signUp = jest.spyOn(supabase.auth, 'signUp');
    getSession.mockResolvedValue({ data: { session }, error: null });
    refreshSession.mockResolvedValue({ data: { session, user: session.user }, error: null });
    mobileFantasyContextRpc = jest.spyOn(supabase, 'rpc');
    jest.spyOn(globalThis, 'fetch');
  });

  function mockFantasyContextRpc(value: unknown): void {
    mobileFantasyContextRpc.mockResolvedValue({ data: value, error: null });
  }

  it('validates the fantasy context response before exposing dashboard data', async () => {
    mockFantasyContextRpc({
        fantasySeasonId: null,
        seasonId: null,
        budget: 100,
        freeTransfers: 2,
        totalPoints: 0,
        globalRank: null,
        gameweek: null,
        chips: {
          tripleCaptainUsed: false,
          tripleCaptainGameweekId: null,
          benchBoostUsed: false,
          benchBoostGameweekId: null,
          wildcardUsed: false,
          wildcardUsedGameweekId: null,
        },
        lineup: [],
        ownedPlayers: [],
      });

    await expect(getFantasyContext()).resolves.toMatchObject({
      budget: 100,
      freeTransfers: 2,
      ownedPlayers: [],
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_fantasy_context');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces errors returned by the direct fantasy-context RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: null,
      error: { message: 'Authentication is required.' },
    });

    await expect(getFantasyContext()).rejects.toThrow('Unable to load fantasy context: Authentication is required.');
  });

  it('rejects unexpected fantasy context shapes instead of assuming defaults', async () => {
    mockFantasyContextRpc({});

    await expect(getFantasyContext()).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
    });
  });

  it('preserves professional team details from fantasy context for planner use', async () => {
    mockFantasyContextRpc({
      fantasySeasonId: 9,
      seasonId: 2,
      budget: 10,
      freeTransfers: 2,
      totalPoints: 0,
      globalRank: null,
      gameweek: null,
      chips: {
        tripleCaptainUsed: false,
        tripleCaptainGameweekId: null,
        benchBoostUsed: false,
        benchBoostGameweekId: null,
        wildcardUsed: false,
        wildcardUsedGameweekId: null,
      },
      lineup: [],
      ownedPlayers: [{
        id: 19,
        name: 'Player',
        in_game_name: null,
        primary_role: 'Carry',
        professional_teams: { id: 4, name: 'Radiant', slug: 'radiant' },
        availability_status: 'available',
        availability_reason: null,
        current_price: 8,
        last_gw_points: 0,
        recent_points: 0,
      }],
    });

    await expect(getFantasyContext()).resolves.toMatchObject({
      ownedPlayers: [{
        id: 19,
        professional_teams: { id: 4, name: 'Radiant', slug: 'radiant' },
      }],
    });
  });

  it('validates the authenticated gameweek schedule RPC response', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      gameweeks: [{
        id: 7,
        gameweek_number: 3,
        start_date: '2026-10-01T00:00:00.000Z',
        end_date: '2026-10-05T00:00:00.000Z',
        deadline: '2026-10-01T12:00:00.000Z',
        status: 'closed',
        match_count: 4,
        tournaments: [{ id: 8, name: 'Autumn Cup', slug: 'autumn-cup' }],
        flags: [{ flag: 'double', team_id: 2 }],
        top_scorer: { name: 'Player One', in_game_name: 'One', total_points: 18 },
        user_score: 42,
      }],
    }, error: null });

    await expect(getGameweeks()).resolves.toMatchObject([{
      id: 7,
      gameweek_number: 3,
      status: 'closed',
      match_count: 4,
      tournaments: [{ id: 8, name: 'Autumn Cup' }],
      flags: [{ flag: 'double' }],
      user_score: 42,
    }]);
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_gameweeks');
  });

  it('parses player team details and upcoming scheduled fixtures for the squad planner', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      matches: [{
        id: 31,
        status: 'scheduled',
        scheduled_time: new Date(Date.now() + 60_000).toISOString(),
        team_a_id: 4,
        team_b_id: 5,
        radiant_team: { name: 'Radiant' },
        dire_team: { name: 'Dire' },
        tournaments: { name: 'Autumn Cup' },
      }],
    }, error: null });

    await expect(getUpcomingTeamFixtures(4)).resolves.toMatchObject([{
      id: 31,
      team_a_id: 4,
      team_b_id: 5,
      team_a: { name: 'Radiant' },
      team_b: { name: 'Dire' },
      tournament_name: 'Autumn Cup',
    }]);
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_matches', {
      p_status: 'scheduled',
      p_gameweek_id: null,
      p_team_id: 4,
      p_tournament_id: null,
      p_limit: 100,
    });
  });

  it('queries and validates the authenticated player directory RPC contract', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      data: [{
        id: 41,
        name: 'Player Name',
        in_game_name: 'PlayerTag',
        primary_role: 'Carry',
        availability_status: 'available',
        current_price: 9.5,
        gameweek_points: 12,
        recent_points: 8.4,
        profile_image_url: 'https://images.example.test/player.png',
        professional_teams: { name: 'Radiant' },
      }],
      total: 38,
      limit: 20,
      offset: 0,
    }, error: null });

    await expect(getPlayers({
      search: 'Tag',
      role: 'Carry',
      availableOnly: true,
      offset: 0,
      limit: 20,
    })).resolves.toMatchObject({
      total: 38,
      players: [{
        id: 41,
        in_game_name: 'PlayerTag',
        current_price: 9.5,
        team_name: 'Radiant',
        profile_image_url: 'https://images.example.test/player.png',
      }],
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_players', {
      p_search: 'Tag',
      p_role: 'Carry',
      p_available_only: true,
      p_offset: 0,
      p_limit: 20,
    });
  });

  it('validates player detail and recent performance from the authenticated RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      player: {
        id: 41,
        name: 'Player Name',
        in_game_name: 'PlayerTag',
        primary_role: 'Carry',
        availability_status: 'available',
        availability_reason: null,
        current_price: 9.5,
        gameweek_points: 12,
        last_gw_points: 12,
        recent_points: 8.4,
        country: 'SE',
        ownership_percentage: 14.2,
        total_season_points: 104.5,
        professional_teams: { id: 3, name: 'Radiant', slug: 'radiant' },
        performances: [{
          id: 501,
          gameweek_id: 7,
          kills: 8,
          deaths: 2,
          assists: 11,
          fantasy_points_breakdown: { total_points: 12 },
        }],
      },
    }, error: null });

    await expect(getPlayerDetail(41)).resolves.toMatchObject({
      id: 41,
      team_name: 'Radiant',
      total_season_points: 104.5,
      performances: [{ gameweek_id: 7, kills: 8, deaths: 2, assists: 11, total_points: 12 }],
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_player_detail', {
      p_player_id: 41,
    });
  });

  it('normalizes player comparison IDs to unique positive IDs and caps the selection at four', () => {
    expect(normalizePlayerComparisonIds('4,4,2,-1,5,7,8,9,invalid')).toEqual([4, 2, 5, 7]);
  });

  it('loads and filters match results through the authenticated RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      matches: [{
        id: 81,
        status: 'scheduled',
        scheduled_at: new Date(Date.now() + 60_000).toISOString(),
        gameweek_id: 7,
        match_number: 1,
        best_of: 3,
        radiant_team_id: 4,
        dire_team_id: 5,
        radiant_team: { name: 'Radiant', tag: 'RAD' },
        dire_team: { name: 'Dire', tag: 'DIR' },
        tournaments: { id: 9, name: 'Autumn Cup', tier: 'Tier 1' },
      }],
    }, error: null });

    await expect(getMatches('upcoming')).resolves.toMatchObject([{
      id: 81,
      status: 'scheduled',
      radiant_team: { name: 'Radiant' },
      tournament: { id: 9, name: 'Autumn Cup' },
    }]);
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_matches', {
      p_status: 'scheduled',
      p_gameweek_id: null,
      p_team_id: null,
      p_tournament_id: null,
      p_limit: 100,
    });
  });

  it('validates match detail player statistics and fantasy points from the RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      match: {
        id: 81,
        status: 'completed',
        scheduled_at: '2026-10-07T10:00:00.000Z',
        gameweek_id: 7,
        match_number: 1,
        best_of: 3,
        radiant_team_id: 4,
        dire_team_id: 5,
        radiant_team: { name: 'Radiant', tag: 'RAD' },
        dire_team: { name: 'Dire', tag: 'DIR' },
        tournaments: { id: 9, name: 'Autumn Cup', tier: 'Tier 1' },
      },
      playerStats: [{
        id: 501,
        player_id: 41,
        team_id: 4,
        hero_name: 'Crystal Maiden',
        kills: 3,
        deaths: 1,
        assists: 15,
        gold_per_minute: 321,
        professional_players: { id: 41, name: 'Player Name', in_game_name: 'PlayerTag' },
      }],
      fantasyBreakdown: [{ player_id: 41, total_points: 12.5 }],
    }, error: null });

    await expect(getMatchDetails(81)).resolves.toMatchObject({
      match: { id: 81, status: 'completed' },
      playerStats: [{ id: 501, player_id: 41, hero_name: 'Crystal Maiden', kills: 3, assists: 15 }],
      fantasyBreakdown: [{ player_id: 41, total_points: 12.5 }],
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_match_details', {
      p_match_id: 81,
    });
  });

  it('rejects malformed match player statistics rather than silently ignoring them', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      match: {
        id: 81,
        status: 'completed',
        scheduled_at: '2026-10-07T10:00:00.000Z',
        gameweek_id: 7,
        match_number: 1,
        best_of: 3,
        radiant_team_id: 4,
        dire_team_id: 5,
        radiant_team: null,
        dire_team: null,
        tournaments: null,
      },
      playerStats: [{ id: 501, player_id: 'invalid', team_id: 4, kills: 2, deaths: 1, assists: 3 }],
      fantasyBreakdown: [],
    }, error: null });

    await expect(getMatchDetails(81)).rejects.toMatchObject({ name: 'ApiError', status: 502 });
  });

  it('validates the tournament directory RPC response', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      tournaments: [{
        id: 9,
        name: 'Autumn Cup',
        slug: 'autumn-cup',
        status: 'eligible',
        tier: 'Tier 1',
        start_date: '2026-10-01T00:00:00.000Z',
        end_date: '2026-10-10T00:00:00.000Z',
        eligible: true,
        series_count: 4,
        participating_teams: [{ id: 4, name: 'Radiant' }],
      }],
    }, error: null });

    await expect(getTournaments()).resolves.toMatchObject([{
      id: 9,
      name: 'Autumn Cup',
      eligible: true,
      participating_teams: [{ id: 4, name: 'Radiant' }],
    }]);
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_tournaments');
  });

  it('validates tournament detail data and its enriched schedule from the RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      tournament: { id: 9, name: 'Autumn Cup', tier: 'Tier 1' },
      matches: [{
        id: 81,
        status: 'scheduled',
        scheduled_at: '2026-10-07T10:00:00.000Z',
        gameweek_id: 7,
        match_number: 1,
        best_of: 3,
        radiant_team_id: 4,
        dire_team_id: 5,
        radiant_team: { name: 'Radiant', tag: 'RADI' },
        dire_team: { name: 'Dire', tag: 'DIRE' },
        tournaments: { id: 9, name: 'Autumn Cup', tier: 'Tier 1' },
      }],
    }, error: null });

    await expect(getTournamentDetails(9)).resolves.toMatchObject({
      tournament: { id: 9, name: 'Autumn Cup', tier: 'Tier 1' },
      matches: [{ id: 81, radiant_team: { name: 'Radiant' }, gameweek_id: 7 }],
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_tournament_details', {
      p_tournament_id: 9,
    });
  });

  it('loads and validates league standings and head-to-head fixtures', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      leagues: [{
        id: 21,
        name: 'Weekend League',
        type: 'h2h',
        privacyLevel: 'private',
        description: 'Friends league',
        maxParticipants: 10,
        currentParticipants: 2,
        inviteCode: 'WEE-1234',
        status: 'active',
        createdAt: '2026-10-01T00:00:00.000Z',
        standings: [{
          userId: 'manager-1',
          manager: 'Manager One',
          points: 84,
          gwPoints: 12,
          rank: 1,
          wins: 3,
          losses: 1,
          draws: 0,
        }],
        fixtures: [{
          id: 31,
          gameweekId: 5,
          home: 'Manager One',
          away: 'Manager Two',
          homePoints: 12,
          awayPoints: 8,
          winnerId: 7,
          isBye: false,
        }],
      }],
    }, error: null });

    await expect(getLeagues()).resolves.toMatchObject([{
      id: 21,
      type: 'h2h',
      standings: [{ userId: 'manager-1', gameweekPoints: 12, wins: 3 }],
      fixtures: [{ gameweekId: 5, homePoints: 12, awayPoints: 8 }],
    }]);
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_leagues');
  });

  it('creates and joins leagues through authenticated RPCs', async () => {
    mobileFantasyContextRpc
      .mockResolvedValueOnce({ data: {
        data: { id: 21, name: 'Weekend League' },
        message: 'League created successfully.',
      }, error: null })
      .mockResolvedValueOnce({ data: {
        data: { id: 22, name: 'Open League' },
        message: 'Joined Open League successfully.',
      }, error: null });

    await expect(createLeague({
      name: 'Weekend League',
      description: 'Friends league',
      type: 'h2h',
      privacyLevel: 'private',
      maxParticipants: 10,
    })).resolves.toMatchObject({ id: 21, name: 'Weekend League' });
    await expect(joinLeague('abc-1234')).resolves.toMatchObject({ id: 22, name: 'Open League' });

    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(1, 'mobile_create_league', {
      p_name: 'Weekend League',
      p_description: 'Friends league',
      p_type: 'h2h',
      p_privacy_level: 'private',
      p_max_participants: 10,
    });
    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(2, 'mobile_join_league', {
      p_invite_code: 'ABC-1234',
    });
  });

  it('loads paginated overall or gameweek leaderboard data from the authenticated RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      leaderboard: [{
        id: 88,
        rank: 3,
        previous_rank: null,
        total_points: 112,
        gameweek_points: 14,
        fantasy_teams: {
          id: 19,
          name: 'Team Radiant',
          user_id: 'manager-19',
          profiles: { username: 'radiant', display_name: 'Radiant Manager' },
        },
      }],
      lastRecalculatedAt: '2026-10-07T10:00:00.000Z',
      pagination: { page: 2, limit: 50, total: 72 },
    }, error: null });

    await expect(getLeaderboard({ page: 2, gameweekId: 7 })).resolves.toMatchObject({
      page: 2,
      limit: 50,
      total: 72,
      entries: [{
        rank: 3,
        totalPoints: 112,
        fantasyTeam: { name: 'Team Radiant', userId: 'manager-19', managerName: 'Radiant Manager' },
      }],
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_leaderboard', {
      p_page: 2,
      p_gameweek_id: 7,
    });
  });

  it('validates manager analytics and leaderboard-related trends from the authenticated RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      user: { totalPoints: 151, globalRank: 28, budget: 12.5, squadValue: 87.5, freeTransfers: 2 },
      trend: [{ gameweekId: 3, userScore: 48, globalAverage: 41.2 }],
      roleBreakdown: [{ role: 'Carry', points: 34.5 }],
      captainEfficiency: { captainPoints: 16, idealCapPoints: 20, efficiency: 80 },
      market: [{ playerName: 'Carry Player', team: 'Radiant', role: 'Carry', ownership: 12, price: 8, roi: 15 }],
      dreamTeam: [{ playerName: 'Carry Player', team: 'Radiant', role: 'Carry', points: 18 }],
      valueForMoney: [{ playerName: 'Carry Player', team: 'Radiant', role: 'Carry', points: 18, ownership: 12, price: 8, roi: 15 }],
    }, error: null });

    await expect(getAnalytics()).resolves.toMatchObject({
      user: { totalPoints: 151, globalRank: 28 },
      trend: [{ gameweekId: 3, userScore: 48 }],
      captainEfficiency: { efficiency: 80 },
      dreamTeam: [{ playerName: 'Carry Player', points: 18 }],
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_analytics');
  });

  it('validates finished season recap data and optional statistics from the authenticated RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: {
      recaps: [{
        seasonId: 2,
        fantasySeasonId: 19,
        seasonName: 'Autumn Season',
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-10-01T00:00:00.000Z',
        totalPoints: 318.5,
        finalGlobalRank: 25,
        bestGameweek: { gameweek: 4, points: 62 },
        rankProgression: { startingRank: 80, finalRank: 25 },
        topPlayer: { name: 'Carry Player', points: 89 },
        transferCount: 7,
        bestLeagueRank: 2,
      }],
    }, error: null });

    await expect(getSeasonRecaps()).resolves.toMatchObject([{
      seasonName: 'Autumn Season',
      totalPoints: 318.5,
      finalGlobalRank: 25,
      bestGameweek: { gameweek: 4, points: 62 },
      transferCount: 7,
    }]);
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_season_recaps');
  });

  it('loads manager notifications and unread count by category', async () => {
    mobileFantasyContextRpc.mockResolvedValueOnce({
      data: {
        notifications: [{
          id: 91,
          type: 'league_result',
          title: 'League result',
          message: 'Your league standings changed.',
          is_read: false,
          created_at: '2026-10-07T10:00:00.000Z',
          metadata: { league_id: 21 },
        }],
        unreadCount: 4,
      },
      error: null,
    });

    await expect(getNotifications('league')).resolves.toMatchObject({
      unreadCount: 4,
      notifications: [{ id: 91, type: 'league_result', is_read: false, metadata: { league_id: 21 } }],
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_notifications', {
      p_category: 'league',
      p_limit: 100,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('supports a bounded notification preview', async () => {
    mobileFantasyContextRpc.mockResolvedValueOnce({
      data: { notifications: [], unreadCount: 0 },
      error: null,
    });

    await expect(getNotifications('all', 5)).resolves.toEqual({
      notifications: [],
      unreadCount: 0,
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_notifications', {
      p_category: 'all',
      p_limit: 5,
    });
  });

  it('filters league invitations into the League category on mobile', () => {
    const invitation = {
      id: 92,
      type: 'league_invite',
      title: 'League invitation',
      message: 'A manager joined your league.',
      is_read: false,
      created_at: '2026-10-07T10:00:00.000Z',
      metadata: { league_id: 21 },
    };

    expect(notificationCategoryForType(invitation.type)).toBe('league');
    expect(matchesNotificationCategory(invitation, 'league')).toBe(true);
    expect(matchesNotificationCategory(invitation, 'unread')).toBe(true);
    expect(matchesNotificationCategory(invitation, 'scoring')).toBe(false);
  });

  it('routes notification actions to the associated player or league when metadata IDs are valid', () => {
    const base = {
      id: 93,
      title: 'Update',
      message: 'Notification message',
      is_read: false,
      created_at: '2026-10-07T10:00:00.000Z',
      metadata: null as Record<string, unknown> | null,
    };

    expect(notificationActionFor({
      ...base,
      type: 'price_change',
      metadata: { player_id: 17 },
    })).toEqual({
      label: 'View player',
      href: { pathname: '/player/[id]', params: { id: '17' } },
    });
    expect(notificationActionFor({
      ...base,
      type: 'league_invite',
      metadata: { league_id: '23' },
    })).toEqual({
      label: 'View league',
      href: { pathname: '/league/[id]', params: { id: '23' } },
    });
  });

  it('falls back to category destinations for missing or invalid notification metadata IDs', () => {
    const base = {
      id: 94,
      title: 'Update',
      message: 'Notification message',
      is_read: false,
      created_at: '2026-10-07T10:00:00.000Z',
    };

    expect(notificationActionFor({
      ...base,
      type: 'price_change',
      metadata: { player_id: '../admin' },
    })).toEqual({ label: 'Open squad planner', href: '/squad-planner' });
    expect(notificationActionFor({
      ...base,
      type: 'league_result',
      metadata: null,
    })).toEqual({ label: 'Open leagues', href: '/leagues' });
  });

  it('marks and clears notifications through authenticated Supabase functions', async () => {
    mobileFantasyContextRpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    await expect(markNotificationRead(91)).resolves.toBeUndefined();
    await expect(markAllNotificationsRead()).resolves.toBeUndefined();
    await expect(clearReadNotifications()).resolves.toBeUndefined();

    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(1, 'mobile_mark_notification_read', {
      p_notification_id: 91,
    });
    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(2, 'mobile_mark_all_notifications_read');
    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(3, 'mobile_clear_read_notifications');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('loads and updates manager profile fields through authenticated Supabase RPCs', async () => {
    mobileFantasyContextRpc
      .mockResolvedValueOnce({
        data: { profile: {
          id: 'test-user',
          username: 'captain',
          display_name: 'Captain',
          email: 'test@example.com',
          email_notifications: true,
          push_notifications: false,
          theme_preference: 'dark',
          member_since: '2026-01-01T00:00:00.000Z',
        } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { profile: {
          id: 'test-user',
          username: 'manager',
          display_name: 'Manager',
          email: 'test@example.com',
          email_notifications: false,
          push_notifications: true,
          theme_preference: 'light',
          member_since: '2026-01-01T00:00:00.000Z',
        } },
        error: null,
      });

    await expect(getManagerProfile()).resolves.toMatchObject({
      id: 'test-user',
      email: 'test@example.com',
      username: 'captain',
      displayName: 'Captain',
      emailNotifications: true,
      pushNotifications: false,
      themePreference: 'dark',
    });
    await expect(updateManagerProfile({
      username: 'manager',
      displayName: 'Manager',
      emailNotifications: false,
      pushNotifications: true,
    })).resolves.toMatchObject({
      username: 'manager',
      displayName: 'Manager',
      emailNotifications: false,
      pushNotifications: true,
      themePreference: 'light',
    });

    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(1, 'mobile_get_profile');
    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(2, 'mobile_update_profile', {
      p_updates: {
      username: 'manager',
      display_name: 'Manager',
      email_notifications: false,
      push_notifications: true,
      },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('loads and saves the account theme preference through authenticated Supabase RPCs', async () => {
    mobileFantasyContextRpc
      .mockResolvedValueOnce({
        data: { profile: {
          id: 'test-user',
          username: 'captain',
          display_name: 'Captain',
          email: 'test@example.com',
          email_notifications: true,
          push_notifications: false,
          theme_preference: 'dark',
          member_since: '2026-01-01T00:00:00.000Z',
        } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { profile: {
          id: 'test-user',
          username: 'captain',
          display_name: 'Captain',
          email: 'test@example.com',
          email_notifications: true,
          push_notifications: false,
          theme_preference: 'light',
          member_since: '2026-01-01T00:00:00.000Z',
        } },
        error: null,
      });

    await expect(getThemePreference()).resolves.toBe('dark');
    await expect(updateThemePreference('light')).resolves.toBe('light');

    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(1, 'mobile_get_profile');
    expect(mobileFantasyContextRpc).toHaveBeenNthCalledWith(2, 'mobile_update_profile', {
      p_updates: { theme_preference: 'light' },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('updates the push preference and registers or removes the current device token', async () => {
    mobileFantasyContextRpc
      .mockResolvedValueOnce({
        data: { profile: {
          id: 'test-user',
          username: 'captain',
          display_name: 'Captain',
          email: 'test@example.com',
          email_notifications: true,
          push_notifications: true,
          theme_preference: 'dark',
          member_since: '2026-01-01T00:00:00.000Z',
        } },
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    await expect(updatePushNotificationPreference(true)).resolves.toMatchObject({
      id: 'test-user',
      pushNotifications: true,
    });
    await expect(registerPushToken('ExponentPushToken[device-123]', 'ios')).resolves.toBeUndefined();
    await expect(removePushToken('ExponentPushToken[device-123]')).resolves.toBeUndefined();

    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_update_profile', {
      p_updates: { push_notifications: true },
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_register_push_token', {
      p_token: 'ExponentPushToken[device-123]',
      p_platform: 'ios',
    });
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_remove_push_token', {
      p_token: 'ExponentPushToken[device-123]',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates a manager account through Supabase Auth with mobile profile metadata', async () => {
    signUp.mockResolvedValue({
      data: { user: { ...session.user, id: 'new-user', email: 'new@example.com' }, session: null },
      error: null,
    });

    await expect(createManagerAccount({
      email: ' NEW@example.com ',
      username: ' new-manager ',
      password: 'long-password',
    })).resolves.toEqual({
      message: 'User created successfully. Please check your email to confirm.',
    });

    expect(signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'long-password',
      options: {
        data: {
          username: 'new-manager',
          display_name: 'new-manager',
          mobile_client: 'fantasy-dota-mobile',
        },
      },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits a lineup through the authenticated ownership-checking RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({ data: true, error: null });
    const lineup = [
      { playerId: 1, slot: 'carry', isCaptain: true, isViceCaptain: false },
      { playerId: 2, slot: 'mid', isCaptain: false, isViceCaptain: true },
      { playerId: 3, slot: 'offlane', isCaptain: false, isViceCaptain: false },
      { playerId: 4, slot: 'support', isCaptain: false, isViceCaptain: false },
      { playerId: 5, slot: 'hard_support', isCaptain: false, isViceCaptain: false },
    ];

    await expect(saveLineup({ fantasySeasonId: 9, gameweekId: 7, lineup })).resolves.toBeUndefined();

    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_save_lineup', {
      p_fantasy_season_id: 9,
      p_gameweek_id: 7,
      p_lineup: lineup,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('adds selected players through the authenticated ownership-checking RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: { budget: 12.5, squadSize: 3, squadMaxSize: 8 },
      error: null,
    });

    await expect(addPlayersToSquad({
      fantasySeasonId: 9,
      playerIds: [101, 102],
    })).resolves.toEqual({
      budget: 12.5,
      squadSize: 3,
      squadMaxSize: 8,
    });

    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_add_players_to_squad', {
      p_fantasy_season_id: 9,
      p_player_ids: [101, 102],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits a transfer through the authenticated ownership-checking RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: { success: true, budget: 12.5, free_transfers_remaining: 1, penalty_points: 4 },
      error: null,
    });

    await expect(processTransfer({
      fantasySeasonId: 9,
      transfersIn: [101],
      transfersOut: [202],
    })).resolves.toEqual({
      budget: 12.5,
      freeTransfersRemaining: 1,
      penaltyPoints: 4,
    });

    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_process_fantasy_transfer', {
      p_fantasy_season_id: 9,
      p_transfers_in: [101],
      p_transfers_out: [202],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits multiple Wildcard transfers together and validates the server result', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: { success: true, budget: 14, free_transfers_remaining: 97, penalty_points: 0 },
      error: null,
    });

    await expect(processTransfer({
      fantasySeasonId: 9,
      transfersIn: [101, 102],
      transfersOut: [201, 202],
    })).resolves.toEqual({
      budget: 14,
      freeTransfersRemaining: 97,
      penaltyPoints: 0,
    });

    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_process_fantasy_transfer', {
      p_fantasy_season_id: 9,
      p_transfers_in: [101, 102],
      p_transfers_out: [201, 202],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces database transfer validation errors without disguising them as successful results', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: { success: false, message: 'No upcoming gameweek available for transfers.' },
      error: null,
    });

    await expect(processTransfer({
      fantasySeasonId: 9,
      transfersIn: [101],
      transfersOut: [202],
    })).rejects.toThrow('No upcoming gameweek available for transfers.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('loads transfer history using an authenticated Supabase function', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: {
        transfers: [{
          id: 15,
          createdAt: '2026-10-07T10:00:00.000Z',
          gameweekNumber: 4,
          penaltyPoints: 4,
          moves: [{ playerOut: 'Player Out', playerIn: 'Player In' }],
        }],
      },
      error: null,
    });

    await expect(getTransferHistory()).resolves.toEqual([{
      id: 15,
      createdAt: '2026-10-07T10:00:00.000Z',
      gameweekNumber: 4,
      penaltyPoints: 4,
      moves: [{ playerOut: 'Player Out', playerIn: 'Player In' }],
    }]);
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_transfer_history', {
      p_limit: 100,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('loads the transfer market through an authenticated Supabase function', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: {
        data: [{
          id: 41,
          name: 'Carry Player',
          in_game_name: 'Carry',
          primary_role: 'Carry',
          availability_status: 'available',
          current_price: 13.5,
          recent_points: 27.4,
        }],
      },
      error: null,
    });

    await expect(getPlayerMarket(' carry ')).resolves.toEqual([{
      id: 41,
      name: 'Carry Player',
      in_game_name: 'Carry',
      primary_role: 'Carry',
      availability_status: 'available',
      current_price: 13.5,
      recent_points: 27.4,
    }]);
    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_get_player_market', {
      p_search: 'carry',
      p_limit: 50,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('activates Wildcard through the authenticated ownership-checking RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: { success: true, message: 'Wildcard activated.', gameweek_id: 7 },
      error: null,
    });

    await expect(activateWildcard({ fantasySeasonId: 9 })).resolves.toEqual({
      message: 'Wildcard activated.',
      gameweekId: 7,
    });

    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_activate_wildcard', {
      p_fantasy_season_id: 9,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('activates a chip through its authenticated ownership-checking RPC', async () => {
    mobileFantasyContextRpc.mockResolvedValue({
      data: { success: true, message: 'Triple Captain activated.', gameweek_id: 7 },
      error: null,
    });

    await expect(activateChip({ fantasySeasonId: 9, chip: 'triple-captain' })).resolves.toEqual({
      message: 'Triple Captain activated.',
      gameweekId: 7,
    });

    expect(mobileFantasyContextRpc).toHaveBeenCalledWith('mobile_activate_triple_captain', {
      p_fantasy_season_id: 9,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
