import MockReact from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScrollView as MockScrollView, Text as MockText, View as MockView } from 'react-native';
import MatchesScreen from '@/app/matches';
import type { MatchPage } from '@/src/features/competition/api';

const mockUseQuery: jest.Mock = jest.fn();
const mockRouterReplace = jest.fn();
let mockSearchParams: { gameweekId?: string } = {};

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockRouterReplace, push: jest.fn() }),
}));

jest.mock('@/src/components/Screen', () => ({
  Screen: MockView,
}));

jest.mock('@/src/components/ScreenScrollView', () => ({
  ScreenScrollView: MockScrollView,
}));

jest.mock('@/src/components/DataFreshnessBadge', () => ({
  DataFreshnessBadge: () => null,
}));

jest.mock('@/src/features/competition/MatchSeriesCard', () => ({
  MatchSeriesCard: ({ group }: { group: { match: { radiant_team: { name: string } | null } } }) =>
    MockReact.createElement(MockText, null, group.match.radiant_team?.name ?? 'Match series'),
}));

jest.mock('@/src/features/competition/api', () => ({
  getMatchesPage: jest.fn(),
  getTournaments: jest.fn(),
}));

jest.mock('@/src/features/fantasy/hooks', () => ({
  useFantasyContext: () => ({ data: { ownedPlayers: [] } }),
}));

jest.mock('@/src/lib/theme', () => ({
  useMobileTheme: jest.fn(() => ({
    colors: { placeholder: '#94a3b8' },
  })),
}));

const matchPage: MatchPage = {
  matches: [{
    id: 801,
    series_id: 90,
    status: 'live',
    scheduled_at: '2026-11-23T10:00:00Z',
    gameweek_id: 5,
    match_number: 1,
    best_of: 3,
    radiant_team_id: 10,
    dire_team_id: 20,
    player_ids: [101],
    radiant_team: { name: 'Team Spirit', tag: 'TS' },
    dire_team: { name: 'Team Liquid', tag: 'TL' },
    tournament: { id: 12, name: 'The International', tier: 'Tier 1' },
  }],
  total: 1,
  page: 1,
  limit: 24,
  counts: { all: 1, live: 1, upcoming: 0, completed: 0 },
};

const tournament = {
  id: 12,
  name: 'The International',
  slug: 'the-international',
  status: 'active',
  tier: 'Tier 1',
  start_date: null,
  end_date: null,
  eligible: true,
  series_count: 1,
  participating_teams: [],
};

function configureQueries({
  matchData = matchPage,
  matchError = null,
}: {
  matchData?: MatchPage | undefined;
  matchError?: Error | null;
} = {}) {
  mockUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) => {
    if (options.queryKey[0] === 'tournaments') {
      return { data: [tournament], isError: false, isPending: false };
    }
    return {
      data: matchData,
      error: matchError,
      isError: matchError !== null,
      isPending: false,
      isRefetching: false,
      refetch: jest.fn(),
    };
  });
}

describe('MatchesScreen', () => {
  beforeEach(() => {
    mockSearchParams = {};
    mockRouterReplace.mockReset();
    mockUseQuery.mockReset();
    configureQueries();
  });

  it('clears status, search, tournament, and gameweek filters together', () => {
    mockSearchParams = { gameweekId: '5' };
    mockRouterReplace.mockImplementation(() => {
      mockSearchParams = {};
    });
    const { getByLabelText, getByText, queryByLabelText } = render(<MatchesScreen />);

    fireEvent.press(getByText('live (1)'));
    fireEvent.changeText(getByLabelText('Search matches'), 'Spirit');
    fireEvent.press(getByText('All tournaments'));
    fireEvent.press(getByText('The International'));

    expect(getByLabelText('4 active match filters')).toBeTruthy();
    fireEvent.press(getByLabelText('Clear all match filters'));

    expect(mockRouterReplace).toHaveBeenCalledWith('/matches');
    expect(queryByLabelText('Clear all match filters')).toBeNull();
    expect(getByLabelText('Search matches').props.value).toBe('');
    expect(getByText('All tournaments')).toBeTruthy();
  });

  it('keeps cached matches visible when a background refresh fails', () => {
    configureQueries({ matchData: matchPage, matchError: new Error('Network unavailable') });
    const { getByText } = render(<MatchesScreen />);

    expect(getByText('Could not refresh matches')).toBeTruthy();
    expect(getByText('Network unavailable')).toBeTruthy();
    expect(getByText('Team Spirit')).toBeTruthy();
  });
});
