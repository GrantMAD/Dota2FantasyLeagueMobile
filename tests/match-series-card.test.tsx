import React from 'react';
import { render } from '@testing-library/react-native';
import type { MatchSummary } from '@/src/features/competition/api';
import { MatchSeriesCard } from '@/src/features/competition/MatchSeriesCard';
import { groupMatchesBySeries } from '@/src/features/competition/match-series';

function makeMatch(overrides: Partial<MatchSummary> & Pick<MatchSummary, 'id'>): MatchSummary {
  return {
    series_id: 9,
    status: 'completed',
    scheduled_at: '2026-11-13T10:00:00Z',
    duration_seconds: 1800,
    gameweek_id: 5,
    match_number: 1,
    best_of: 3,
    radiant_team_id: 10,
    dire_team_id: 20,
    winner_team_id: 10,
    player_ids: [],
    radiant_team: { name: 'Team A', tag: 'TA' },
    dire_team: { name: 'Team B', tag: 'TB' },
    tournament: null,
    ...overrides,
  };
}

describe('MatchSeriesCard', () => {
  it('explains when a completed game in the series is still missing player stats', () => {
    const games = [
      makeMatch({ id: 1, match_number: 1, player_ids: [101] }),
      makeMatch({ id: 2, match_number: 2, player_ids: [] }),
    ];
    const group = groupMatchesBySeries(games)[0];
    const { getByText } = render(
      <MatchSeriesCard
        group={group}
        appearance={{ kind: 'none', playerNames: [] }}
        onPress={() => undefined}
      />,
    );

    expect(getByText('Player stats for 1 completed game are still being processed.')).toBeTruthy();
  });

  it('renders the Bo1 badge and Completed for single-game matches without series mislabeling', () => {
    const singleBo1 = makeMatch({ id: 1, match_number: 1, best_of: 1, player_ids: [101] });
    const group = groupMatchesBySeries([singleBo1])[0];
    const { getByText, queryByText } = render(
      <MatchSeriesCard
        group={group}
        appearance={{ kind: 'none', playerNames: [] }}
        onPress={() => undefined}
      />,
    );

    expect(getByText('Bo1')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
    expect(queryByText('Series complete')).toBeNull();
    expect(queryByText(/Series score/)).toBeNull();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });

  it('renders the Bo3 badge and Series complete for multi-game Bo3 series', () => {
    const games = [
      makeMatch({ id: 1, match_number: 1, best_of: 3, player_ids: [101] }),
      makeMatch({ id: 2, match_number: 2, best_of: 3, player_ids: [101] }),
    ];
    const group = groupMatchesBySeries(games)[0];
    const { getByText, queryByText } = render(
      <MatchSeriesCard
        group={group}
        appearance={{ kind: 'none', playerNames: [] }}
        onPress={() => undefined}
      />,
    );

    expect(getByText('Bo3')).toBeTruthy();
    expect(getByText('Series complete')).toBeTruthy();
    expect(queryByText('Completed')).toBeNull();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });
});
