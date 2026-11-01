import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter, type Href } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import {
  clearReadNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationActionFor,
  notificationCategoryForType,
  type ManagerNotification,
  type NotificationAction,
  type NotificationCategory,
  type NotificationPage,
} from '@/src/features/notifications/api';
import { groupNotificationsByDay } from '@/src/features/notifications/presentation';

const categories: { key: NotificationCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'deadline', label: 'Deadlines' },
  { key: 'market', label: 'Market' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'league', label: 'Leagues' },
];

const emptyState: Record<NotificationCategory, { title: string; description: string; href: Href | null; action: string | null }> = {
  all: { title: 'You are all caught up', description: 'No fantasy alerts or notifications right now. Check back during upcoming match days.', href: '/', action: 'Back to dashboard' },
  unread: { title: 'No unread notifications', description: 'You are all caught up. All your notifications have been marked as read.', href: null, action: null },
  deadline: { title: 'No deadline alerts', description: 'You have no pending lineup locks, transfer cutoffs, or upcoming gameweek deadlines.', href: { pathname: '/team', params: { tab: 'lineup' } }, action: 'Check lineup' },
  market: { title: 'No market updates', description: 'No player price changes, transfer market trends, or chip alerts to report right now.', href: { pathname: '/team', params: { tab: 'transfers' } }, action: 'Browse market' },
  scoring: { title: 'No scoring updates', description: 'Scores, match completions, and fantasy point adjustments will appear here when games conclude.', href: '/gameweeks', action: 'View gameweeks' },
  league: { title: 'No league activity', description: 'No head-to-head match results, rank movements, or commissioner messages yet.', href: '/leagues', action: 'Go to leagues' },
};

type NotificationPresentation = {
  label: string;
  icon: ComponentProps<typeof SymbolView>['name'];
  color: string;
  surface: string;
  row: string;
};

function notificationPresentation(notification: ManagerNotification): NotificationPresentation {
  const { type, metadata } = notification;
  const priceChange = Number(metadata?.price_change ?? 0);
  if (type === 'issue_report_status') {
    return {
      label: 'Issue report',
      icon: { ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' },
      color: '#a78bfa',
      surface: 'border-violet-500/30 bg-violet-500/10',
      row: 'border-l-violet-500',
    };
  }
  if (['player_removed', 'player_unavailable'].includes(type) || (type === 'system' && metadata?.player_id)) {
    return {
      label: 'Squad alert',
      icon: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
      color: '#fb7185',
      surface: 'border-rose-500/30 bg-rose-500/10',
      row: 'border-l-rose-500',
    };
  }
  if (notificationCategoryForType(type) === 'deadline') {
    return {
      label: 'Deadline',
      icon: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
      color: '#fbbf24',
      surface: 'border-amber-500/30 bg-amber-500/10',
      row: 'border-l-amber-500',
    };
  }
  if (notificationCategoryForType(type) === 'market') {
    const falling = type === 'price_change' && priceChange < 0;
    return {
      label: 'Market',
      icon: falling
        ? { ios: 'chart.line.downtrend.xyaxis', android: 'trending_down', web: 'trending_down' }
        : { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
      color: falling ? '#fb7185' : '#34d399',
      surface: falling ? 'border-rose-500/30 bg-rose-500/10' : 'border-emerald-500/30 bg-emerald-500/10',
      row: falling ? 'border-l-rose-500' : 'border-l-emerald-500',
    };
  }
  if (notificationCategoryForType(type) === 'league') {
    return {
      label: 'League',
      icon: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
      color: '#a78bfa',
      surface: 'border-violet-500/30 bg-violet-500/10',
      row: 'border-l-violet-500',
    };
  }
  if (notificationCategoryForType(type) === 'scoring') {
    return {
      label: 'Scoring',
      icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
      color: '#34d399',
      surface: 'border-emerald-500/30 bg-emerald-500/10',
      row: 'border-l-emerald-500',
    };
  }
  return {
    label: 'Update',
    icon: { ios: 'info.circle.fill', android: 'info', web: 'info' },
    color: '#94a3b8',
    surface: 'border-slate-600 bg-slate-800',
    row: 'border-l-slate-600',
  };
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Date unavailable';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<NotificationCategory>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const queryKey = ['notifications', 'center', category] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => getNotifications(category),
    staleTime: 30_000,
  });
  const notifications = query.data?.notifications ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;
  const nextCursor = query.data?.nextCursor ?? null;
  const notificationGroups = groupNotificationsByDay(notifications);
  const empty = emptyState[category];
  const emptyHref = empty.href;
  const invalidateNotifications = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const readOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidateNotifications,
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Unable to mark notification as read.'),
  });
  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidateNotifications,
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Unable to mark notifications as read.'),
  });
  const clearRead = useMutation({
    mutationFn: clearReadNotifications,
    onSuccess: invalidateNotifications,
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Unable to clear read notifications.'),
  });
  const busy = readOne.isPending || readAll.isPending || clearRead.isPending;

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const page = await getNotifications(category, 30, nextCursor);
      queryClient.setQueryData<NotificationPage>(queryKey, (current) => {
        if (!current) return page;
        const existingIds = new Set(current.notifications.map((item) => item.id));
        return {
          ...page,
          notifications: [
            ...current.notifications,
            ...page.notifications.filter((item) => !existingIds.has(item.id)),
          ],
        };
      });
    } catch (error) {
      setPaginationError(error instanceof Error ? error.message : 'Unable to load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  }

  function openAction(notificationId: number, isRead: boolean, action: NotificationAction) {
    setActionError(null);
    if (isRead) {
      router.push(action.href);
      return;
    }
    readOne.mutate(notificationId, {
      onSuccess: () => router.push(action.href),
    });
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#14b8a6" />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Updates</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Notifications</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">Deadlines, scoring, market changes, and league activity.</Text>
          <Link href="/profile" asChild>
            <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start">
              <Text className="font-semibold text-brand-300">Notification preferences →</Text>
            </Pressable>
          </Link>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {categories.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: category === item.key }}
              className={`min-h-10 justify-center rounded-full border px-4 ${
                category === item.key ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
              }`}
              onPress={() => {
                setActionError(null);
                setPaginationError(null);
                setCategory(item.key);
              }}
            >
              <Text className={`text-sm font-semibold ${category === item.key ? 'text-brand-300' : 'text-slate-300'}`}>
                {item.label}{item.key === 'unread' ? ` (${unreadCount})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {notifications.length || unreadCount > 0 ? (
          <View className="flex-row gap-3">
            {unreadCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2"
                disabled={busy}
                onPress={() => {
                  setActionError(null);
                  readAll.mutate();
                }}
              >
                <Text className="text-xs font-semibold text-slate-200">
                  Mark all read
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              className="min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2"
              disabled={busy || !notifications.some((notification) => notification.is_read)}
              onPress={() => {
                setActionError(null);
                clearRead.mutate();
              }}
            >
              <Text className={`text-xs font-semibold ${
                notifications.some((notification) => notification.is_read) ? 'text-slate-200' : 'text-slate-500'
              }`}>
                Clear read
              </Text>
            </Pressable>
          </View>
        ) : null}

        {actionError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{actionError}</Text> : null}

        {query.isPending ? (
          <View accessibilityLabel="Loading notifications" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Notifications unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load notifications.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : notifications.length ? (
          <View className="gap-5">
            {notificationGroups.map((group) => (
              <View key={group.label} className="gap-3">
                <Text className="text-xs font-semibold uppercase tracking-[2px] text-slate-400">
                  {group.label === 'Earlier' ? 'Earlier this season' : group.label}
                </Text>
                {group.notifications.map((notification) => {
                  const action = notificationActionFor(notification);
                  const presentation = notificationPresentation(notification);
                  const gameweekNumber = Number(notification.metadata?.gameweek_number);
                  return (
                    <View
                      key={notification.id}
                      className={`flex-row gap-3 rounded-xl border border-l-4 p-4 ${
                        notification.is_read ? 'border-slate-800 bg-slate-900 opacity-75' : `${presentation.row} bg-slate-900`
                      }`}
                    >
                      <View className={`h-10 w-10 items-center justify-center rounded-xl border ${presentation.surface}`}>
                        <SymbolView name={presentation.icon} size={20} tintColor={presentation.color} />
                      </View>
                      <View className="flex-1 gap-3">
                        <View>
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${
                              presentation.surface
                            }`} style={{ color: presentation.color }}>
                              {presentation.label}
                            </Text>
                            {!notification.is_read ? (
                              <Text className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase text-cyan-300">
                                Unread
                              </Text>
                            ) : null}
                            <Text className="ml-auto text-xs text-slate-500">{relativeTime(notification.created_at)}</Text>
                          </View>
                          <Text className="font-semibold text-white">{notification.title}</Text>
                          <Text className="mt-1 text-sm leading-5 text-slate-300">{notification.message}</Text>
                          {Number.isInteger(gameweekNumber) && gameweekNumber > 0 ? (
                            <Text className="mt-2 text-xs text-slate-500">Gameweek {gameweekNumber}</Text>
                          ) : null}
                        </View>
                        <View className="flex-row flex-wrap items-center gap-3">
                          <Pressable
                            accessibilityRole="button"
                            className="min-h-10 justify-center rounded-lg bg-cyan-500 px-3"
                            disabled={busy}
                            onPress={() => openAction(notification.id, notification.is_read, action)}
                          >
                            <Text className="text-xs font-bold uppercase tracking-wider text-on-accent">{action.label} →</Text>
                          </Pressable>
                          {!notification.is_read ? (
                            <Pressable
                              accessibilityRole="button"
                              disabled={busy}
                              onPress={() => {
                                setActionError(null);
                                readOne.mutate(notification.id);
                              }}
                            >
                              <Text className="text-xs font-semibold text-slate-300">Mark read</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            {paginationError ? (
              <View accessibilityRole="alert" className="gap-2">
                <Text className="text-sm text-red-300">{paginationError}</Text>
                <Pressable accessibilityRole="button" onPress={loadMore}>
                  <Text className="font-semibold text-white">Retry loading notifications</Text>
                </Pressable>
              </View>
            ) : null}
            {nextCursor ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-12 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10"
                disabled={loadingMore}
                onPress={loadMore}
              >
                {loadingMore
                  ? <ActivityIndicator color="#14b8a6" />
                  : <Text className="font-semibold text-brand-300">Load more notifications</Text>}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <View className="h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800">
              <SymbolView
                name={{
                  ios: category === 'deadline' ? 'clock' : category === 'league' ? 'trophy' : category === 'scoring' ? 'sparkles' : 'bell',
                  android: category === 'deadline' ? 'schedule' : category === 'league' ? 'emoji_events' : category === 'scoring' ? 'auto_awesome' : 'notifications',
                  web: category === 'deadline' ? 'schedule' : category === 'league' ? 'emoji_events' : category === 'scoring' ? 'auto_awesome' : 'notifications',
                }}
                size={28}
                tintColor="#94a3b8"
              />
            </View>
            <Text className="text-center text-base font-semibold text-white">{emptyState[category].title}</Text>
            <Text className="text-center text-sm leading-5 text-slate-400">{emptyState[category].description}</Text>
            {emptyHref && empty.action ? (
              <Pressable accessibilityRole="button" onPress={() => router.push(emptyHref)}>
                <Text className="font-semibold text-brand-300">{empty.action} →</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
