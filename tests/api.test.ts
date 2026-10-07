import type { Session } from '@supabase/supabase-js';
import { ApiError, apiFetch } from '../src/lib/api';
import { activateChip, activateWildcard, addPlayersToSquad, getFantasyContext, getUpcomingTeamFixtures, processTransfer, saveLineup } from '../src/features/fantasy/api';
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

process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
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

function jsonResponse(status: number, payload: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
  } as Response;
}

describe('mobile API client', () => {
  const supabase = getSupabaseClient();
  let getSession: jest.SpyInstance;
  let refreshSession: jest.SpyInstance;

  beforeEach(() => {
    getSession = jest.spyOn(supabase.auth, 'getSession');
    refreshSession = jest.spyOn(supabase.auth, 'refreshSession');
    getSession.mockResolvedValue({ data: { session }, error: null });
    refreshSession.mockResolvedValue({ data: { session, user: session.user }, error: null });
    jest.spyOn(globalThis, 'fetch');
  });

  it('sends the current access token to the configured API origin', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, { totalPoints: 42 }));

    await expect(apiFetch<{ totalPoints: number }>('/api/fantasy/context')).resolves.toEqual({
      totalPoints: 42,
    });

    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.example.test/api/fantasy/context');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(init?.credentials).toBe('omit');
  });

  it('refreshes the session and retries an idempotent request once after a 401', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Invalid or expired token' }))
      .mockResolvedValueOnce(jsonResponse(200, { totalPoints: 42 }));

    await expect(apiFetch<{ totalPoints: number }>('/api/fantasy/context')).resolves.toEqual({
      totalPoints: 42,
    });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not replay a non-idempotent request after a 401', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(401, { error: 'Invalid or expired token' }));

    await expect(apiFetch('/api/fantasy/lineup', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    } satisfies Partial<ApiError>);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('validates the fantasy context response before exposing dashboard data', async () => {
    jest.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
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
      })
    );

    await expect(getFantasyContext()).resolves.toMatchObject({
      budget: 100,
      freeTransfers: 2,
      ownedPlayers: [],
    });
  });

  it('rejects unexpected fantasy context shapes instead of assuming defaults', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));

    await expect(getFantasyContext()).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
    });
  });

  it('preserves professional team details from fantasy context for planner use', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getFantasyContext()).resolves.toMatchObject({
      ownedPlayers: [{
        id: 19,
        professional_teams: { id: 4, name: 'Radiant', slug: 'radiant' },
      }],
    });
  });

  it('validates the shared gameweek schedule response', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getGameweeks()).resolves.toMatchObject([{
      id: 7,
      gameweek_number: 3,
      status: 'closed',
      match_count: 4,
      tournaments: [{ id: 8, name: 'Autumn Cup' }],
      flags: [{ flag: 'double' }],
      user_score: 42,
    }]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://api.example.test/api/gameweeks');
  });

  it('parses player team details and upcoming scheduled fixtures for the squad planner', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getUpcomingTeamFixtures(4)).resolves.toMatchObject([{
      id: 31,
      team_a_id: 4,
      team_b_id: 5,
      team_a: { name: 'Radiant' },
      team_b: { name: 'Dire' },
      tournament_name: 'Autumn Cup',
    }]);
    const [url] = jest.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/api/matches?');
    expect(String(url)).toContain('teamId=4');
    expect(String(url)).toContain('status=scheduled');
  });

  it('queries and validates the shared player directory contract', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

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
    const [url] = jest.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/api/players?');
    expect(String(url)).toContain('role=Carry');
    expect(String(url)).toContain('search=Tag');
  });

  it('validates player detail and recent performance response from the shared API', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getPlayerDetail(41)).resolves.toMatchObject({
      id: 41,
      team_name: 'Radiant',
      total_season_points: 104.5,
      performances: [{ gameweek_id: 7, kills: 8, deaths: 2, assists: 11, total_points: 12 }],
    });
    expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://api.example.test/api/players/41');
  });

  it('normalizes player comparison IDs to unique positive IDs and caps the selection at four', () => {
    expect(normalizePlayerComparisonIds('4,4,2,-1,5,7,8,9,invalid')).toEqual([4, 2, 5, 7]);
  });

  it('loads and filters shared match results for the match center', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getMatches('upcoming')).resolves.toMatchObject([{
      id: 81,
      status: 'scheduled',
      radiant_team: { name: 'Radiant' },
      tournament: { id: 9, name: 'Autumn Cup' },
    }]);
    const [url] = jest.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/api/matches?');
    expect(String(url)).toContain('status=scheduled');
  });

  it('validates match detail player statistics and fantasy points', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getMatchDetails(81)).resolves.toMatchObject({
      match: { id: 81, status: 'completed' },
      playerStats: [{ id: 501, player_id: 41, hero_name: 'Crystal Maiden', kills: 3, assists: 15 }],
      fantasyBreakdown: [{ player_id: 41, total_points: 12.5 }],
    });
  });

  it('rejects malformed match player statistics rather than silently ignoring them', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getMatchDetails(81)).rejects.toMatchObject({ name: 'ApiError', status: 502 });
  });

  it('validates the tournament directory response', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getTournaments()).resolves.toMatchObject([{
      id: 9,
      name: 'Autumn Cup',
      eligible: true,
      participating_teams: [{ id: 4, name: 'Radiant' }],
    }]);
    expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://api.example.test/api/tournaments');
  });

  it('validates tournament detail data and its enriched schedule', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getTournamentDetails(9)).resolves.toMatchObject({
      tournament: { id: 9, name: 'Autumn Cup', tier: 'Tier 1' },
      matches: [{ id: 81, radiant_team: { name: 'Radiant' }, gameweek_id: 7 }],
    });
    expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://api.example.test/api/tournaments/9');
  });

  it('loads and validates league standings and head-to-head fixtures', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getLeagues()).resolves.toMatchObject([{
      id: 21,
      type: 'h2h',
      standings: [{ userId: 'manager-1', gameweekPoints: 12, wins: 3 }],
      fixtures: [{ gameweekId: 5, homePoints: 12, awayPoints: 8 }],
    }]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://api.example.test/api/leagues');
  });

  it('creates and joins leagues through the existing API without replaying writes', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(201, {
        data: { id: 21, name: 'Weekend League' },
        message: 'League created successfully.',
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        data: { id: 22, name: 'Open League' },
        message: 'Joined Open League successfully.',
      }));

    await expect(createLeague({
      name: 'Weekend League',
      description: 'Friends league',
      type: 'h2h',
      privacyLevel: 'private',
      maxParticipants: 10,
    })).resolves.toMatchObject({ id: 21, name: 'Weekend League' });
    await expect(joinLeague('abc-1234')).resolves.toMatchObject({ id: 22, name: 'Open League' });

    expect(fetch).toHaveBeenCalledTimes(2);
    const [, createRequest] = jest.mocked(fetch).mock.calls[0];
    const [, joinRequest] = jest.mocked(fetch).mock.calls[1];
    expect(createRequest?.method).toBe('POST');
    expect(JSON.parse(String(createRequest?.body))).toMatchObject({ name: 'Weekend League', type: 'h2h' });
    expect(joinRequest?.method).toBe('POST');
    expect(JSON.parse(String(joinRequest?.body))).toEqual({ action: 'join', inviteCode: 'ABC-1234' });
  });

  it('loads paginated overall or gameweek leaderboard data from the shared API', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

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
    expect(String(jest.mocked(fetch).mock.calls[0][0])).toContain('/api/leaderboard?page=2&limit=50&gameweekId=7');
  });

  it('validates manager analytics and leaderboard-related trends from the shared API', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
      user: { totalPoints: 151, globalRank: 28, budget: 12.5, squadValue: 87.5, freeTransfers: 2 },
      trend: [{ gameweekId: 3, userScore: 48, globalAverage: 41.2 }],
      roleBreakdown: [{ role: 'Carry', points: 34.5 }],
      captainEfficiency: { captainPoints: 16, idealCapPoints: 20, efficiency: 80 },
      market: [{ playerName: 'Carry Player', team: 'Radiant', role: 'Carry', ownership: 12, price: 8, roi: 15 }],
      dreamTeam: [{ playerName: 'Carry Player', team: 'Radiant', role: 'Carry', points: 18 }],
      valueForMoney: [{ playerName: 'Carry Player', team: 'Radiant', role: 'Carry', points: 18, ownership: 12, price: 8, roi: 15 }],
    }));

    await expect(getAnalytics()).resolves.toMatchObject({
      user: { totalPoints: 151, globalRank: 28 },
      trend: [{ gameweekId: 3, userScore: 48 }],
      captainEfficiency: { efficiency: 80 },
      dreamTeam: [{ playerName: 'Carry Player', points: 18 }],
    });
    expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://api.example.test/api/analytics');
  });

  it('validates finished season recap data and optional statistics', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getSeasonRecaps()).resolves.toMatchObject([{
      seasonName: 'Autumn Season',
      totalPoints: 318.5,
      finalGlobalRank: 25,
      bestGameweek: { gameweek: 4, points: 62 },
      transferCount: 7,
    }]);
    expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://api.example.test/api/season-recap');
  });

  it('loads manager notifications and unread count by category', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, {
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
    }));

    await expect(getNotifications('league')).resolves.toMatchObject({
      unreadCount: 4,
      notifications: [{ id: 91, type: 'league_result', is_read: false, metadata: { league_id: 21 } }],
    });
    expect(String(jest.mocked(fetch).mock.calls[0][0])).toContain('/api/notifications?category=league&limit=100');
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

  it('uses existing notification read and clear endpoints without retrying writes', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Notification marked as read.' }))
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Notifications marked as read.' }))
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Read notifications cleared.' }));

    await expect(markNotificationRead(91)).resolves.toBeUndefined();
    await expect(markAllNotificationsRead()).resolves.toBeUndefined();
    await expect(clearReadNotifications()).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(jest.mocked(fetch).mock.calls.map(([url, init]) => [String(url), init?.method])).toEqual([
      ['https://api.example.test/api/notifications/91/read', 'PUT'],
      ['https://api.example.test/api/notifications', 'PUT'],
      ['https://api.example.test/api/notifications', 'DELETE'],
    ]);
  });

  it('loads and updates manager profile fields using the existing authenticated API', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, {
        profile: {
          id: 'test-user',
          username: 'captain',
          display_name: 'Captain',
          email: 'test@example.com',
          email_notifications: true,
          push_notifications: false,
          theme_preference: 'dark',
          member_since: '2026-01-01T00:00:00.000Z',
        },
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        profile: {
          id: 'test-user',
          username: 'manager',
          display_name: 'Manager',
          email: 'test@example.com',
          email_notifications: false,
          push_notifications: true,
          theme_preference: 'light',
          member_since: '2026-01-01T00:00:00.000Z',
        },
      }));

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

    const [url, init] = jest.mocked(fetch).mock.calls[1];
    expect(url).toBe('https://api.example.test/api/user/profile');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({
      username: 'manager',
      display_name: 'Manager',
      email_notifications: false,
      push_notifications: true,
    });
  });

  it('loads and saves the account theme preference through the existing endpoint', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { theme: 'dark' }))
      .mockResolvedValueOnce(jsonResponse(200, { theme: 'light' }));

    await expect(getThemePreference()).resolves.toBe('dark');
    await expect(updateThemePreference('light')).resolves.toBe('light');

    const [getUrl, getInit] = jest.mocked(fetch).mock.calls[0];
    const [putUrl, putInit] = jest.mocked(fetch).mock.calls[1];
    expect(getUrl).toBe('https://api.example.test/api/user/theme');
    expect(getInit?.method).toBeUndefined();
    expect(putUrl).toBe('https://api.example.test/api/user/theme');
    expect(putInit?.method).toBe('PUT');
    expect(JSON.parse(String(putInit?.body))).toEqual({ theme: 'light' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('updates the push preference and registers or removes the current device token', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, {
        profile: {
          id: 'test-user',
          username: 'captain',
          display_name: 'Captain',
          email: 'test@example.com',
          email_notifications: true,
          push_notifications: true,
          theme_preference: 'dark',
          member_since: '2026-01-01T00:00:00.000Z',
        },
      }))
      .mockResolvedValueOnce(jsonResponse(200, { registered: true }))
      .mockResolvedValueOnce(jsonResponse(200, { removed: true }));

    await expect(updatePushNotificationPreference(true)).resolves.toMatchObject({
      id: 'test-user',
      pushNotifications: true,
    });
    await expect(registerPushToken('ExponentPushToken[device-123]', 'ios')).resolves.toBeUndefined();
    await expect(removePushToken('ExponentPushToken[device-123]')).resolves.toBeUndefined();

    const calls = jest.mocked(fetch).mock.calls;
    expect(calls.map(([url, init]) => [String(url), init?.method])).toEqual([
      ['https://api.example.test/api/user/profile', 'PUT'],
      ['https://api.example.test/api/user/push-token', 'POST'],
      ['https://api.example.test/api/user/push-token', 'DELETE'],
    ]);
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({ push_notifications: true });
    expect(JSON.parse(String(calls[1][1]?.body))).toEqual({
      token: 'ExponentPushToken[device-123]',
      platform: 'ios',
    });
    expect(JSON.parse(String(calls[2][1]?.body))).toEqual({
      token: 'ExponentPushToken[device-123]',
    });
  });

  it('creates a manager account once through the unauthenticated signup endpoint', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(201, {
      message: 'User created successfully. Please check your email to confirm.',
      user: { id: 'new-user', email: 'new@example.com' },
    }));

    await expect(createManagerAccount({
      email: ' NEW@example.com ',
      username: ' new-manager ',
      password: 'long-password',
    })).resolves.toEqual({
      message: 'User created successfully. Please check your email to confirm.',
    });

    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.example.test/api/auth/signup');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'new@example.com',
      username: 'new-manager',
      password: 'long-password',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('submits a lineup using the existing API contract without replaying the write', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, { message: 'Lineup saved successfully.' }));
    const lineup = [
      { playerId: 1, slot: 'carry', isCaptain: true, isViceCaptain: false },
      { playerId: 2, slot: 'mid', isCaptain: false, isViceCaptain: true },
      { playerId: 3, slot: 'offlane', isCaptain: false, isViceCaptain: false },
      { playerId: 4, slot: 'support', isCaptain: false, isViceCaptain: false },
      { playerId: 5, slot: 'hard_support', isCaptain: false, isViceCaptain: false },
    ];

    await expect(saveLineup({ gameweekId: 7, lineup })).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = jest.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ gameweekId: 7, lineup });
  });

  it('adds selected players through the existing squad API and validates its result', async () => {
    jest.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { budget: 12.5, squadSize: 3, squadMaxSize: 8 })
    );

    await expect(addPlayersToSquad({
      fantasySeasonId: 9,
      playerIds: [101, 102],
    })).resolves.toEqual({
      budget: 12.5,
      squadSize: 3,
      squadMaxSize: 8,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.example.test/api/fantasy/squad/add');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ fantasySeasonId: 9, playerIds: [101, 102] });
  });

  it('submits a transfer once and validates the authoritative server result', async () => {
    jest.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { budget: 12.5, free_transfers_remaining: 1, penalty_points: 4 })
    );

    await expect(processTransfer({
      fantasySeasonId: 9,
      transfersIn: [101],
      transfersOut: [202],
    })).resolves.toEqual({
      budget: 12.5,
      freeTransfersRemaining: 1,
      penaltyPoints: 4,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = jest.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      fantasySeasonId: 9,
      transfersIn: [101],
      transfersOut: [202],
    });
  });

  it('submits multiple Wildcard transfers together and validates the server result', async () => {
    jest.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { budget: 14, free_transfers_remaining: 97, penalty_points: 0 })
    );

    await expect(processTransfer({
      fantasySeasonId: 9,
      transfersIn: [101, 102],
      transfersOut: [201, 202],
    })).resolves.toEqual({
      budget: 14,
      freeTransfersRemaining: 97,
      penaltyPoints: 0,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = jest.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      fantasySeasonId: 9,
      transfersIn: [101, 102],
      transfersOut: [201, 202],
    });
  });

  it('activates Wildcard once through its existing endpoint', async () => {
    jest.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { message: 'Wildcard activated.', gameweekId: 7 })
    );

    await expect(activateWildcard({ fantasySeasonId: 9 })).resolves.toEqual({
      message: 'Wildcard activated.',
      gameweekId: 7,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.example.test/api/fantasy/wildcard');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ fantasySeasonId: 9 });
  });

  it('activates a chip through its existing endpoint without replaying the write', async () => {
    jest.mocked(fetch).mockResolvedValue(jsonResponse(200, { message: 'Triple Captain activated.', gameweekId: 7 }));

    await expect(activateChip({ fantasySeasonId: 9, chip: 'triple-captain' })).resolves.toEqual({
      message: 'Triple Captain activated.',
      gameweekId: 7,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.example.test/api/fantasy/triple-captain');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ fantasySeasonId: 9 });
  });
});
