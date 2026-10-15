import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import NotificationsScreen from '../app/notifications';
import {
  clearReadNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../src/features/notifications/api';

jest.mock('@/src/components/Screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/src/components/ScreenScrollView', () => ({
  ScreenScrollView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../src/features/notifications/api', () => ({
  clearReadNotifications: jest.fn(),
  getNotifications: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
  matchesNotificationCategory: (notification: { is_read: boolean; type: string }, category: string) => {
    if (category === 'all') return true;
    if (category === 'unread') return !notification.is_read;
    return category === 'scoring' && notification.type === 'gameweek_result';
  },
  notificationActionFor: () => ({ label: 'View gameweek', href: '/gameweeks' }),
  notificationCategoryForType: (type: string) => type === 'gameweek_result' ? 'scoring' : null,
}));

const mockedGetNotifications = jest.mocked(getNotifications);
const mockedMarkAllNotificationsRead = jest.mocked(markAllNotificationsRead);
const mockedMarkNotificationRead = jest.mocked(markNotificationRead);
const mockedClearReadNotifications = jest.mocked(clearReadNotifications);
let queryClient: QueryClient | null = null;

describe('Notifications screen', () => {
  afterEach(() => {
    cleanup();
    queryClient?.clear();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetNotifications.mockResolvedValue({
      notifications: [{
        id: 1,
        type: 'gameweek_result',
        title: 'Gameweek result',
        message: 'Your score is ready.',
        is_read: false,
        created_at: new Date().toISOString(),
        metadata: null,
      }],
      unreadCount: 1,
    });
    mockedMarkAllNotificationsRead.mockResolvedValue();
    mockedMarkNotificationRead.mockResolvedValue();
    mockedClearReadNotifications.mockResolvedValue();
  });

  it('shows the global mark-all action when the selected category has no entries', async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });
    queryClient = client;
    const view = render(
      <QueryClientProvider client={client}>
        <NotificationsScreen />
      </QueryClientProvider>
    );

    await waitFor(() => expect(view.getByText('Gameweek result')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Leagues (0)' }));

    expect(view.queryByText('You are all caught up')).toBeTruthy();
    const markAllButton = view.getByRole('button', { name: 'Mark all read' });
    expect(markAllButton).toBeTruthy();

    await fireEvent.press(markAllButton);
    await waitFor(() => expect(mockedMarkAllNotificationsRead).toHaveBeenCalledTimes(1));
  });
});
