import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
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
      nextCursor: null,
    });
    mockedMarkAllNotificationsRead.mockResolvedValue();
    mockedMarkNotificationRead.mockResolvedValue();
    mockedClearReadNotifications.mockResolvedValue();
  });

  it('shows the global mark-all action when the selected category has no entries', async () => {
    mockedGetNotifications.mockImplementation(async (category) => ({
      notifications: category === 'league' ? [] : [{
        id: 1,
        type: 'gameweek_result',
        title: 'Gameweek result',
        message: 'Your score is ready.',
        is_read: false,
        created_at: new Date().toISOString(),
        metadata: null,
      }],
      unreadCount: 1,
      nextCursor: null,
    }));
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
    await fireEvent.press(view.getByRole('button', { name: 'Leagues' }));

    await waitFor(() => expect(view.getByText('No league activity')).toBeTruthy());
    const markAllButton = view.getByRole('button', { name: 'Mark all read' });
    expect(markAllButton).toBeTruthy();

    await fireEvent.press(markAllButton);
    await waitFor(() => expect(mockedMarkAllNotificationsRead).toHaveBeenCalledTimes(1));
  });

  it('loads category-filtered cursor pages and appends the next page', async () => {
    const first = {
      id: 1,
      type: 'gameweek_result',
      title: 'First result',
      message: 'First page.',
      is_read: false,
      created_at: '2026-10-10T10:00:00.000Z',
      metadata: null,
    };
    const second = {
      ...first,
      id: 2,
      title: 'Second result',
      message: 'Next page.',
      created_at: '2026-10-09T10:00:00.000Z',
    };
    mockedGetNotifications
      .mockResolvedValueOnce({
        notifications: [first],
        unreadCount: 2,
        nextCursor: { createdAt: first.created_at, id: first.id },
      })
      .mockResolvedValueOnce({
        notifications: [second],
        unreadCount: 2,
        nextCursor: null,
      });
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

    await waitFor(() => expect(view.getByText('First result')).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: 'Load more notifications' }));
      await mockedGetNotifications.mock.results[1].value;
    });
    await waitFor(() => expect(view.getByText('Second result')).toBeTruthy());
    expect(mockedGetNotifications).toHaveBeenNthCalledWith(1, 'all');
    expect(mockedGetNotifications).toHaveBeenNthCalledWith(2, 'all', 30, {
      createdAt: first.created_at,
      id: first.id,
    });
  });
});
