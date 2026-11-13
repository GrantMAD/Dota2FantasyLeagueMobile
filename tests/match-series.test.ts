import type { MatchSummary } from '@/src/features/competition/api';
import {
  getDefaultSeriesGame,
  groupMatchesBySeries,
  shouldShowMatchSeries,
  summarizeMatchSeries,
} from '@/src/features/competition/match-series';

function makeMatch(overrides: Partial<MatchSummary> & Pick<MatchSummary, 'id'>): MatchSummary {
  return {
    series_id: 9,
    status: 'completed',
    scheduled_at: `2026-11-13T1${overrides.id}:00:00Z`,
    duration_seconds: 1800,
    gameweek_id: 5,
    match_number: 1,
    best_of: 3,
    radiant_team_id: 10,
    dire_team_id: 20,
    winner_team_id: null,
    player_ids: [],
    radiant_team: { name: 'Team A', tag: 'TA' },
    dire_team: { name: 'Team B', tag: 'TB' },
    tournament: null,
    ...overrides,
  };
}

describe('match series helpers', () => {
  it('groups sibling games by series, gameweek, and unordered team pair', () => {
    const gameOne = makeMatch({ id: 1, match_number: 1, winner_team_id: 10 });
    const gameTwo = makeMatch({
      id: 2,
      match_number: 2,
      radiant_team_id: 20,
      dire_team_id: 10,
      winner_team_id: 10,
      scheduled_at: '2026-11-13T20:00:00Z',
    });
    const unrelated = makeMatch({
      id: 3,
      gameweek_id: 6,
      match_number: 1,
      radiant_team_id: 30,
      dire_team_id: 40,
    });

    const groups = groupMatchesBySeries([
      { ...gameTwo, series_matches: [gameOne, gameTwo] },
      unrelated,
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].games.map((game) => game.id)).toEqual([1, 2]);
    expect(groups[0].match.id).toBe(1);
    expect(groups[1].games.map((game) => game.id)).toEqual([3]);
  });

  it('groups flat tournament match rows from the same series without nested sibling data', () => {
    const first = makeMatch({ id: 1, match_number: 1 });
    const second = makeMatch({
      id: 2,
      match_number: 2,
      radiant_team_id: 20,
      dire_team_id: 10,
    });

    expect(groupMatchesBySeries([first, second])).toMatchObject([
      { games: [{ id: 1 }, { id: 2 }] },
    ]);
  });

  it('keeps unscopable or unrelated series IDs separate', () => {
    const first = makeMatch({ id: 1, gameweek_id: null });
    const second = makeMatch({ id: 2, gameweek_id: null });
    const otherPair = makeMatch({ id: 3, radiant_team_id: 30, dire_team_id: 40 });

    expect(groupMatchesBySeries([first, second, otherPair]).map((group) => group.games.map((game) => game.id)))
      .toEqual([[1], [2], [3]]);
  });

  it('shows a completed series if any game has player stats and keeps non-completed fixtures', () => {
    expect(shouldShowMatchSeries([makeMatch({ id: 1 })])).toBe(false);
    expect(shouldShowMatchSeries([
      makeMatch({ id: 1 }),
      makeMatch({ id: 2, match_number: 2, player_ids: [101] }),
    ])).toBe(true);
    expect(shouldShowMatchSeries([makeMatch({ id: 3, status: 'scheduled' })])).toBe(true);
    expect(shouldShowMatchSeries([makeMatch({ id: 4, status: 'live' })])).toBe(true);
  });

  it('summarizes wins across games and chooses Game 1 by default', () => {
    const gameOne = makeMatch({ id: 1, match_number: 1, winner_team_id: 10 });
    const gameTwo = makeMatch({
      id: 2,
      match_number: 2,
      radiant_team_id: 20,
      dire_team_id: 10,
      winner_team_id: 10,
      scheduled_at: '2026-11-13T20:00:00Z',
    });

    expect(summarizeMatchSeries([gameOne, gameTwo])).toMatchObject({
      radiantWins: 2,
      direWins: 0,
      completedGames: 2,
      clinchedTeamId: 10,
      isComplete: true,
    });
    expect(getDefaultSeriesGame([gameTwo, gameOne])).toBe(gameOne);
  });
});
