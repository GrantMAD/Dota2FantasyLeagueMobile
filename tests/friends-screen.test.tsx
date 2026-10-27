import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import FriendsScreen from '../app/friends';
import {
  getFriendActivity,
  getFriendProgress,
  getFollowing,
  searchFriends,
  setFriendFollow,
} from '../src/features/friends/api';

jest.mock('@/src/components/Screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/src/components/ScreenScrollView', () => ({
  ScreenScrollView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/src/lib/theme', () => ({
  useMobileTheme: () => ({ colors: { placeholder: '#94a3b8' } }),
}));

jest.mock('../src/features/friends/api', () => ({
  getFriendActivity: jest.fn(),
  getFriendProgress: jest.fn(),
  getFollowing: jest.fn(),
  searchFriends: jest.fn(),
  setFriendFollow: jest.fn(),
}));

const mockedGetActivity = jest.mocked(getFriendActivity);
const mockedGetProgress = jest.mocked(getFriendProgress);
const mockedGetFollowing = jest.mocked(getFollowing);
const mockedSearchFriends = jest.mocked(searchFriends);
const mockedSetFollow = jest.mocked(setFriendFollow);
const manager = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  username: 'tealmanager',
  display_name: 'Teal Manager',
  avatar_url: null,
};
let queryClient: QueryClient | null = null;

describe('Friends screen', () => {
  afterEach(() => {
    cleanup();
    queryClient?.clear();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetFollowing.mockResolvedValue([manager]);
    mockedGetActivity.mockResolvedValue({ activities: [], nextCursor: null });
    mockedGetProgress.mockResolvedValue({
      manager,
      season: {
        id: 7,
        name: 'Season 7',
        total_points: 82,
        global_rank: 4,
        gameweeks: [{
          id: 10,
          gameweek_number: 2,
          gameweek_points: 35,
          total_points: 82,
          rank: 4,
          updated_at: '2026-10-27T10:00:00.000Z',
        }],
      },
    });
    mockedSearchFriends.mockResolvedValue([]);
    mockedSetFollow.mockResolvedValue();
  });

  it('opens the followed manager progress modal with season and gameweek history', async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });
    queryClient = client;
    const view = render(
      <QueryClientProvider client={client}>
        <FriendsScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(view.getByText('@tealmanager')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'View Teal Manager progress' }));
    await waitFor(() => expect(view.getByText('Season 7')).toBeTruthy());
    expect(view.getByText('82 points')).toBeTruthy();
    expect(view.getByText('Gameweek 2')).toBeTruthy();
    expect(mockedGetProgress).toHaveBeenCalledWith(manager.id);
  });

  it('allows a manager to unfollow someone from the following list', async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });
    queryClient = client;
    const view = render(
      <QueryClientProvider client={client}>
        <FriendsScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(view.getByRole('button', { name: 'Unfollow Teal Manager' })).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Unfollow Teal Manager' }));
    await waitFor(() => expect(mockedSetFollow).toHaveBeenCalledWith(manager.id, false));
  });
});
