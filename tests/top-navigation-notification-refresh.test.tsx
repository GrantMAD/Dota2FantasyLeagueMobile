import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TopNavigationBar } from '../src/components/TopNavigationBar';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../src/features/notifications/api';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/src/lib/auth', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'manager-id',
        email: 'manager@example.com',
        user_metadata: {},
      },
    },
    signOut: jest.fn(),
  }),
}));

jest.mock('@/src/lib/theme', () => ({
  useMobileTheme: () => ({
    colors: { tabBarInactive: '#94a3b8' },
    theme: 'dark',
  }),
}));

jest.mock('@/src/lib/premium', () => ({
  isPremiumUser: () => false,
}));

jest.mock('@/src/features/account/api', () => ({
  getManagerAvatarUrl: jest.fn().mockResolvedValue(null),
  getManagerProfile: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/src/features/players/api', () => ({
  getPlayers: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/features/notifications/api', () => ({
  getNotifications: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
  notificationActionFor: () => ({ label: 'Open', href: '/' }),
  notificationCategoryForType: () => null,
}));

const mockedGetNotifications = jest.mocked(getNotifications);
const mockedMarkAllNotificationsRead = jest.mocked(markAllNotificationsRead);
const mockedMarkNotificationRead = jest.mocked(markNotificationRead);

describe('Top navigation notification read-state refresh', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });
    mockedGetNotifications.mockResolvedValue({
      notifications: [{
        id: 1,
        type: 'live_squad_match',
        title: 'Squad match update',
        message: 'A squad player is in a live match.',
        is_read: false,
        created_at: new Date().toISOString(),
        metadata: { match_id: 55 },
      }],
      unreadCount: 1,
      nextCursor: null,
    });
    mockedMarkAllNotificationsRead.mockResolvedValue();
    mockedMarkNotificationRead.mockResolvedValue();
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  async function openNotificationDropdown() {
    const view = render(
      <QueryClientProvider client={queryClient}>
        <TopNavigationBar />
      </QueryClientProvider>
    );
    await waitFor(() => expect(view.getByRole('button', { name: 'Notifications, 1 unread' })).toBeTruthy());
    fireEvent.press(view.getByRole('button', { name: 'Notifications, 1 unread' }));
    return view;
  }

  it('refreshes Dashboard What’s New after a notification is marked read', async () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const view = await openNotificationDropdown();

    fireEvent.press(view.getByRole('button', { name: 'Mark "Squad match update" as read' }));

    await waitFor(() => {
      expect(mockedMarkNotificationRead.mock.calls[0]?.[0]).toBe(1);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard-whats-new'] });
    });
  });

  it('refreshes Dashboard What’s New after all notifications are marked read', async () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const view = await openNotificationDropdown();

    fireEvent.press(view.getByRole('button', { name: 'Mark all notifications as read' }));

    await waitFor(() => {
      expect(mockedMarkAllNotificationsRead).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard-whats-new'] });
    });
  });
});
