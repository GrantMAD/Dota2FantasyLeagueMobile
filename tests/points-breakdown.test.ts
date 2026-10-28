import { parseDashboardPointsBreakdown } from '../src/features/fantasy/points-breakdown';

const categories = (overrides: Partial<Record<string, number>> = {}) => ({
  combat: 0,
  economy: 0,
  objective: 0,
  teamfight: 0,
  win: 0,
  series: 0,
  performance: 0,
  consistency: 0,
  penalty: 0,
  ...overrides,
});

describe('parseDashboardPointsBreakdown', () => {
  it('applies auto-subs, vice-captain fallback, and Triple Captain to the scoring categories', () => {
    const breakdown = parseDashboardPointsBreakdown({
      seasonName: 'Season 1',
      totalPoints: 13,
      tripleCaptainGameweekId: 2,
      benchBoostGameweekId: null,
      gameweeks: [
        {
          id: 1,
          gameweekNumber: 1,
          total_points: 7,
          carry_id: 1,
          mid_id: 2,
          offlane_id: 3,
          support_id: 4,
          hard_support_id: 5,
          bench_1_id: 6,
          bench_2_id: null,
          bench_3_id: null,
          captain_player_id: 1,
          vice_captain_player_id: 2,
        },
        {
          id: 2,
          gameweekNumber: 2,
          total_points: 6,
          carry_id: 3,
          mid_id: 2,
          offlane_id: 1,
          support_id: 4,
          hard_support_id: 5,
          bench_1_id: null,
          bench_2_id: null,
          bench_3_id: null,
          captain_player_id: 3,
          vice_captain_player_id: 2,
        },
      ],
      players: [
        { id: 1, name: 'Carry One', in_game_name: null, primary_role: 'Carry' },
        { id: 2, name: 'Mid Two', in_game_name: null, primary_role: 'Mid' },
        { id: 3, name: 'Carry Three', in_game_name: null, primary_role: 'Carry' },
        { id: 4, name: 'Support Four', in_game_name: null, primary_role: 'Support' },
        { id: 5, name: 'Support Five', in_game_name: null, primary_role: 'Hard Support' },
        { id: 6, name: 'Bench Carry', in_game_name: null, primary_role: 'Carry' },
      ],
      performances: [
        { gameweek_id: 1, player_id: 2, categories: categories({ economy: 2 }) },
        { gameweek_id: 1, player_id: 6, categories: categories({ combat: 3 }) },
        { gameweek_id: 2, player_id: 3, categories: categories({ combat: 2 }) },
      ],
    });

    expect(breakdown.gameweeks.map((gameweek) => gameweek.gameweekNumber)).toEqual([2, 1]);
    expect(breakdown.gameweeks[0].contributors[0]).toMatchObject({
      playerId: 3,
      multiplier: 3,
      points: 6,
      isCaptain: true,
    });
    expect(breakdown.gameweeks[1].contributors).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerId: 6, points: 3, isAutoSub: true }),
      expect.objectContaining({ playerId: 2, points: 4, isViceCaptain: true, multiplier: 2 }),
    ]));
    expect(breakdown.categoryTotals).toMatchObject({ combat: 9, economy: 4 });
    expect(breakdown.unitemizedPoints).toBe(0);
  });

  it('rejects malformed RPC payloads rather than showing a partial score breakdown', () => {
    expect(() => parseDashboardPointsBreakdown({ totalPoints: 12 })).toThrow(
      'Points breakdown was returned in an unexpected format.',
    );
  });

  it('includes all selected players when Bench Boost is active', () => {
    const breakdown = parseDashboardPointsBreakdown({
      seasonName: null,
      totalPoints: 4,
      tripleCaptainGameweekId: null,
      benchBoostGameweekId: 1,
      gameweeks: [{
        id: 1,
        gameweekNumber: 1,
        total_points: 4,
        carry_id: 1,
        mid_id: 2,
        offlane_id: 3,
        support_id: 4,
        hard_support_id: 5,
        bench_1_id: 6,
        bench_2_id: null,
        bench_3_id: null,
        captain_player_id: 1,
        vice_captain_player_id: 2,
      }],
      players: [
        { id: 1, name: 'Captain', in_game_name: null, primary_role: 'Carry' },
        { id: 2, name: 'Mid', in_game_name: null, primary_role: 'Mid' },
        { id: 3, name: 'Offlane', in_game_name: null, primary_role: 'Offlane' },
        { id: 4, name: 'Support', in_game_name: null, primary_role: 'Support' },
        { id: 5, name: 'Hard Support', in_game_name: null, primary_role: 'Hard Support' },
        { id: 6, name: 'Bench', in_game_name: null, primary_role: 'Carry' },
      ],
      performances: [
        { gameweek_id: 1, player_id: 1, categories: categories({ combat: 1 }) },
        { gameweek_id: 1, player_id: 6, categories: categories({ combat: 2 }) },
      ],
    });

    expect(breakdown.gameweeks[0].benchBoost).toBe(true);
    expect(breakdown.gameweeks[0].contributors).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerId: 1, points: 2, isCaptain: true }),
      expect.objectContaining({ playerId: 6, points: 2 }),
    ]));
  });
});
