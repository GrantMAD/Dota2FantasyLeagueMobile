import React from 'react';
import { render } from '@testing-library/react-native';
import { DashboardLiveMatches } from '@/src/features/dashboard/DashboardLiveMatches';
import type { MatchSummary } from '@/src/features/competition/api';

describe('DashboardLiveMatches', () => {
  const mockMatches: MatchSummary[] = [
    {
      id: 801,
      status: 'live',
      scheduled_at: '2026-10-17T14:00:00Z',
      gameweek_id: 2,
      match_number: 1,
      best_of: 3,
      radiant_team_id: 10,
      dire_team_id: 20,
      radiant_team: { name: 'Team Spirit', tag: 'TS' },
      dire_team: { name: 'Team Liquid', tag: 'TL' },
      tournament: { id: 1, name: 'The International 2026', tier: 'Tier 1' },
    },
    {
      id: 802,
      status: 'live',
      scheduled_at: '2026-10-17T15:00:00Z',
      gameweek_id: 2,
      match_number: 2,
      best_of: 2,
      radiant_team_id: 30,
      dire_team_id: 40,
      radiant_team: { name: 'Gaimin Gladiators', tag: 'GG' },
      dire_team: { name: 'BetBoom Team', tag: 'BB' },
      tournament: { id: 2, name: 'DreamLeague Season 25', tier: 'Tier 1' },
    },
  ];

  it('renders nothing when matches array is empty', () => {
    const { toJSON } = render(<DashboardLiveMatches matches={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders live matches with team names, tags, and BoX format', () => {
    const { getByText } = render(<DashboardLiveMatches matches={mockMatches} />);

    expect(getByText('Live Matches')).toBeTruthy();
    expect(getByText('2 Live')).toBeTruthy();

    expect(getByText('Team Spirit')).toBeTruthy();
    expect(getByText('Team Liquid')).toBeTruthy();
    expect(getByText('TS')).toBeTruthy();
    expect(getByText('TL')).toBeTruthy();
    expect(getByText('The International 2026')).toBeTruthy();
    expect(getByText('Bo3')).toBeTruthy();

    expect(getByText('Gaimin Gladiators')).toBeTruthy();
    expect(getByText('BetBoom Team')).toBeTruthy();
    expect(getByText('DreamLeague Season 25')).toBeTruthy();
    expect(getByText('Bo2')).toBeTruthy();
  });

  it('displays Starters in Action pill when user starter team matches', () => {
    const { getByText } = render(
      <DashboardLiveMatches matches={mockMatches} userStarterTeamIds={[10]} />
    );

    expect(getByText('Starters in Action')).toBeTruthy();
  });
});
