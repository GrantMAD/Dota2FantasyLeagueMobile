import { calculateFixtureDifficulty } from '../src/features/fantasy/fixture-difficulty';

describe('calculateFixtureDifficulty', () => {
  it.each([
    [0, 1, 'Very Easy'],
    [2, 1, 'Very Easy'],
    [3, 2, 'Easy'],
    [5, 3, 'Average'],
    [6, 4, 'Hard'],
    [7, 5, 'Very Hard'],
  ] as const)('maps %i wins in a 10-match sample to rating %i (%s)', (wins, rating, label) => {
    const matches = Array.from({ length: 10 }, (_, index) => ({
      team_a_id: 8,
      team_b_id: 9,
      winner_team_id: index < wins ? 9 : 8,
      scheduled_time: new Date(Date.now() - index * 60_000).toISOString(),
    }));

    expect(calculateFixtureDifficulty(9, matches)).toMatchObject({
      games: 10,
      wins,
      losses: 10 - wins,
      rating,
      label,
    });
  });

  it('keeps the rating unknown when fewer than five decisive results are available', () => {
    expect(calculateFixtureDifficulty(9, [{
      team_a_id: 8,
      team_b_id: 9,
      winner_team_id: 8,
      scheduled_time: new Date().toISOString(),
    }])).toMatchObject({
      games: 1,
      rating: null,
      label: 'Unknown',
    });
  });
});
