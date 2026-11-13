import type { MatchDetails } from '@/src/features/competition/api';
import { calculateSeriesFantasyImpact, calculateSeriesLeaders } from '@/src/features/competition/match-series-stats';

function makeGame(
  id: number,
  matchNumber: number,
  playerId: number,
  overrides: Partial<MatchDetails['playerStats'][number]> = {},
): MatchDetails {
  const stat = {
    id,
    player_id: playerId,
    series_player_key: 'steam-account:101',
    team_id: 10,
    hero_name: 'Crystal Maiden',
    kills: matchNumber === 1 ? 5 : 7,
    deaths: 1,
    assists: 10,
    gold_per_minute: matchNumber === 1 ? 600 : 400,
    experience_per_minute: 500,
    hero_damage: matchNumber === 1 ? 20_000 : 30_000,
    player: { id: playerId, name: 'Player One', in_game_name: 'One' },
    ...overrides,
  };

  return {
    match: {
      id,
      series_id: 9,
      status: 'completed',
      scheduled_at: `2026-11-13T${matchNumber + 10}:00:00Z`,
      duration_seconds: matchNumber === 1 ? 2400 : 1200,
      gameweek_id: 5,
      match_number: matchNumber,
      best_of: 3,
      radiant_team_id: 10,
      dire_team_id: 20,
      winner_team_id: 10,
      player_ids: [playerId],
      radiant_team: { name: 'Team A', tag: 'TA' },
      dire_team: { name: 'Team B', tag: 'TB' },
      tournament: null,
    },
    seriesMatches: [],
    playerStats: [stat],
    fantasyBreakdown: [{
      player_id: playerId,
      total_points: matchNumber === 1 ? 12 : 25,
    }],
    userFantasyImpact: null,
  };
}

describe('calculateSeriesLeaders', () => {
  it('aggregates series totals while retaining each games contribution', () => {
    const leaders = calculateSeriesLeaders([
      makeGame(101, 1, 1),
      makeGame(102, 2, 2),
    ]);

    expect(leaders.fantasyMVP).toMatchObject({
      playerId: 1,
      value: 37,
      formattedValue: '37.0 pts',
      gameValues: [
        { matchId: 101, matchNumber: 1, value: 12, formattedValue: '12.0 pts' },
        { matchId: 102, matchNumber: 2, value: 25, formattedValue: '25.0 pts' },
      ],
    });
    expect(leaders.highestDamage).toMatchObject({ value: 50_000 });
    expect(leaders.highestEconomy).toMatchObject({
      value: 32_000,
      formattedValue: '~32,000 gold',
      gameValues: [{ value: 24_000 }, { value: 8_000 }],
    });
    expect(leaders.highestKills).toMatchObject({ value: 12 });
  });
});

describe('calculateSeriesFantasyImpact', () => {
  it('sums a player points and captain-adjusted contribution across games', () => {
    const games = [
      makeGame(101, 1, 1),
      makeGame(102, 2, 2),
    ];
    const impact = {
      userOwnedPlayerIds: [1, 2],
      lineupDetails: [{
        playerId: 1,
        slot: 'Carry',
        isCaptain: true,
        isViceCaptain: false,
        isStarter: true,
      }, {
        playerId: 2,
        slot: 'Carry',
        isCaptain: true,
        isViceCaptain: false,
        isStarter: true,
      }],
    };
    const result = calculateSeriesFantasyImpact(games, impact);

    expect(result.totalEffectivePoints).toBe(74);
    expect(result.players).toMatchObject([{
      playerId: 1,
      fantasyPoints: 37,
      effectivePoints: 74,
      gamesPlayed: 2,
      gameValues: [
        { matchId: 101, matchNumber: 1, fantasyPoints: 12, effectivePoints: 24 },
        { matchId: 102, matchNumber: 2, fantasyPoints: 25, effectivePoints: 50 },
      ],
    }]);

    expect(calculateSeriesFantasyImpact(games, {
      ...impact,
      tripleCaptainActive: true,
    }).totalEffectivePoints).toBe(111);
  });
});
