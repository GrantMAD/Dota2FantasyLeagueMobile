import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import {
  clearReadNotifications,
  getNotifications,
  matchesNotificationCategory,
  markAllNotificationsRead,
  markNotificationRead,
  notificationActionFor,
  notificationCategoryForType,
  type NotificationAction,
  type NotificationCategory,
} from '@/src/features/notifications/api';

const categories: { key: NotificationCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'deadline', label: 'Deadlines' },
  { key: 'market', label: 'Market' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'league', label: 'Leagues' },
];

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
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications('all'),
    staleTime: 30_000,
  });
  const notifications = query.data?.notifications ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;
  const visibleNotifications = notifications
    .filter((notification) => matchesNotificationCategory(notification, category));
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
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#fb923c" />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Updates</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Notifications</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">Deadlines, scoring, market changes, and league activity.</Text>
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
                setCategory(item.key);
              }}
            >
              <Text className={`text-sm font-semibold ${category === item.key ? 'text-brand-300' : 'text-slate-300'}`}>
                {item.label}{item.key === 'unread' && unreadCount ? ` (${unreadCount})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {visibleNotifications.length ? (
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2"
              disabled={busy || unreadCount === 0}
              onPress={() => {
                setActionError(null);
                readAll.mutate();
              }}
            >
              <Text className={`text-xs font-semibold ${unreadCount ? 'text-slate-200' : 'text-slate-500'}`}>
                Mark all read
              </Text>
            </Pressable>
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
            <ActivityIndicator color="#fb923c" />
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
        ) : visibleNotifications.length ? (
          <View className="gap-3">
            {visibleNotifications.map((notification) => {
              const action = notificationActionFor(notification);
              const typeCategory = notificationCategoryForType(notification.type);
              return (
                <View
                  key={notification.id}
                  className={`gap-3 rounded-2xl border p-4 ${
                    notification.is_read ? 'border-slate-800 bg-slate-900' : 'border-cyan-800/70 bg-cyan-950/30'
                  }`}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-semibold text-white">{notification.title}</Text>
                      <Text className="mt-1 text-sm leading-5 text-slate-300">{notification.message}</Text>
                    </View>
                    {!notification.is_read ? <View className="mt-1 h-2 w-2 rounded-full bg-cyan-300" /> : null}
                  </View>
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-xs uppercase tracking-wider text-slate-500">
                      {typeCategory ?? 'Update'} · {relativeTime(notification.created_at)}
                    </Text>
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
                  <Pressable
                    accessibilityRole="button"
                    className="min-h-10 items-center justify-center rounded-lg bg-cyan-500 px-3"
                    disabled={busy}
                    onPress={() => openAction(notification.id, notification.is_read, action)}
                  >
                    <Text className="text-xs font-bold uppercase tracking-wider text-on-accent">{action.label}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-base font-semibold text-white">You are all caught up</Text>
            <Text className="mt-2 text-center text-sm text-slate-400">
              No {category === 'all' ? '' : `${category} `}notifications to show.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
