import React from 'react';
import { render } from '@testing-library/react-native';
import { DashboardLiveMatches } from '@/src/features/dashboard/DashboardLiveMatches';
import type { MatchSummary } from '@/src/features/competition/api';
import type { ThemePreference } from '@/src/features/account/api';
import { useMobileTheme } from '@/src/lib/theme';

jest.mock('@/src/lib/theme', () => ({
  useMobileTheme: jest.fn(() => ({ theme: 'dark' })),
}));

const mockedUseMobileTheme = jest.mocked(useMobileTheme);

function themeContext(theme: ThemePreference): ReturnType<typeof useMobileTheme> {
  return {
    theme,
    colors: {
      placeholder: '#94a3b8',
      onAccent: '#ffffff',
      tabBarBackground: '#020617',
      tabBarBorder: '#1e293b',
      tabBarActive: '#14b8a6',
      tabBarInactive: '#94a3b8',
    },
    isLoading: false,
    isSaving: false,
    error: null,
    setTheme: async (nextTheme) => nextTheme,
  };
}

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
      player_ids: [101],
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
      player_ids: [],
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
    mockedUseMobileTheme.mockReturnValue(themeContext('dark'));
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

  it.each(['dark', 'light'] as const)(
    'shows long names on full-width cards in %s mode',
    (theme) => {
      mockedUseMobileTheme.mockReturnValue(themeContext(theme));
      const tournamentName = 'The International Championship Qualifier';
      const radiantName = 'Very Long Radiant Esports Team Name';
      const direName = 'Another Extremely Long Dire Team Name';
      const longMatch = {
        ...mockMatches[0],
        radiant_team: { name: radiantName, tag: 'RAD' },
        dire_team: { name: direName, tag: 'DIR' },
        tournament: { id: 9, name: tournamentName, tier: 'Tier 1' },
      };
      const { getByText, getByLabelText } = render(<DashboardLiveMatches matches={[longMatch]} />);

      expect(getByText(tournamentName)).toBeTruthy();
      expect(getByText(radiantName).props.numberOfLines).toBeUndefined();
      expect(getByText(direName).props.numberOfLines).toBeUndefined();
      expect(getByLabelText(`View live match ${radiantName} vs ${direName}`)).toBeTruthy();
    },
  );

  it('highlights a confirmed player from the full squad', () => {
    const { getByText } = render(
      <DashboardLiveMatches
        matches={mockMatches}
        ownedPlayers={[{
          id: 101,
          name: 'Wang Chunyu',
          in_game_name: 'Ame',
          primary_role: 'carry',
          profile_image_url: null,
          professional_teams: { id: 10, name: 'Team Spirit', slug: null },
          availability_status: null,
          availability_reason: null,
          current_price: 10,
          last_gw_points: 0,
          recent_points: 0,
        }]}
      />
    );

    expect(getByText('Ame in Action')).toBeTruthy();
  });

  it('marks a team fixture unconfirmed when player statistics are not available', () => {
    const { getByText } = render(
      <DashboardLiveMatches
        matches={mockMatches.map((match) =>
          match.id === 801 ? { ...match, player_ids: [] } : match,
        )}
        ownedPlayers={[{
          id: 101,
          name: 'Wang Chunyu',
          in_game_name: 'Ame',
          primary_role: 'carry',
          profile_image_url: null,
          professional_teams: { id: 10, name: 'Team Spirit', slug: null },
          availability_status: null,
          availability_reason: null,
          current_price: 10,
          last_gw_points: 0,
          recent_points: 0,
        }]}
      />
    );

    expect(getByText('Squad fixture · unconfirmed')).toBeTruthy();
  });
});
