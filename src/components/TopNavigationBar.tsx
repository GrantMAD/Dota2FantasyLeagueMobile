import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getManagerAvatarUrl, getManagerProfile } from '@/src/features/account/api';
import {
  getNotifications,
  markNotificationRead,
  notificationActionFor,
  notificationCategoryForType,
  type ManagerNotification,
} from '@/src/features/notifications/api';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

type OpenDropdown = 'notifications' | 'profile' | null;

const profileMenuItems: { label: string; href: Href }[] = [
  { label: 'Gameweeks', href: '/gameweeks' },
  { label: 'Squad Planner', href: '/squad-planner' },
  { label: 'Global Leaderboard', href: '/leaderboard' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Season Recap', href: '/season-recap' },
  { label: 'Notifications', href: '/notifications' },
  { label: 'Learn & Rules', href: '/learn' },
  { label: 'Profile & Settings', href: '/profile' },
];

function getAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function getInitials(value: string): string {
  const initials = value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
  return initials.toUpperCase() || '?';
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Date unavailable';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

export function TopNavigationBar() {
  const { session, signOut } = useAuth();
  const { colors, theme } = useMobileTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const [avatarFailed, setAvatarFailed] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [notificationActionError, setNotificationActionError] = useState<string | null>(null);
  const user = session?.user;
  const profileQuery = useQuery({
    queryKey: ['manager-profile'],
    queryFn: getManagerProfile,
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const avatarQuery = useQuery({
    queryKey: ['manager-avatar', user?.id],
    queryFn: () => {
      if (!user) throw new Error('Authentication is required to load the profile image.');
      return getManagerAvatarUrl(user.id);
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'preview'],
    queryFn: () => getNotifications('all', 5),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => setNotificationActionError(
      error instanceof Error ? error.message : 'Unable to open this notification.'
    ),
  });

  const metadata = user?.user_metadata;
  const avatarUrl = getAvatarUrl(avatarQuery.data ?? metadata?.avatar_url ?? metadata?.picture);

  if (!user) return null;

  const userLabel =
    profileQuery.data?.displayName?.trim() ||
    profileQuery.data?.username ||
    (typeof metadata?.full_name === 'string' ? metadata.full_name : null) ||
    user.email?.split('@')[0] ||
    'Manager';
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const dropdownWidth = Math.min(360, width - 24);
  const palette = theme === 'dark'
    ? {
        panel: '#0f172a',
        elevated: '#1e293b',
        border: '#334155',
        text: '#f8fafc',
        secondaryText: '#cbd5e1',
        mutedText: '#94a3b8',
        accent: '#fdba74',
        error: '#fca5a5',
      }
    : {
        panel: '#ffffff',
        elevated: '#f1f5f9',
        border: '#cbd5e1',
        text: '#0f172a',
        secondaryText: '#334155',
        mutedText: '#64748b',
        accent: '#c2410c',
        error: '#b91c1c',
      };

  function closeDropdown() {
    setOpenDropdown(null);
  }

  function openNotification(notification: ManagerNotification) {
    const action = notificationActionFor(notification);
    const navigate = () => {
      setNotificationActionError(null);
      closeDropdown();
      router.push(action.href);
    };
    if (notification.is_read) {
      navigate();
      return;
    }
    markRead.mutate(notification.id, { onSuccess: navigate });
  }

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
      closeDropdown();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.');
    }
  }

  return (
    <>
      <SafeAreaView className="border-b border-slate-800 bg-slate-950" edges={['top', 'left', 'right']}>
        <View className="h-14 flex-row items-center justify-between px-4">
          <Text className="text-sm font-bold uppercase tracking-[2px] text-brand-400">Fantasy Dota</Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: openDropdown === 'notifications' }}
              className="h-11 w-11 items-center justify-center rounded-full"
              onPress={() => setOpenDropdown(openDropdown === 'notifications' ? null : 'notifications')}
            >
              <SymbolView
                name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
                size={23}
                tintColor={colors.tabBarInactive}
              />
              {unreadCount > 0 ? (
                <View className="absolute right-0 top-0 min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1">
                  <Text className="text-[9px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityLabel="Open profile menu"
              accessibilityRole="button"
              accessibilityState={{ expanded: openDropdown === 'profile' }}
              className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-brand-500 bg-slate-800"
              onPress={() => {
                setSignOutError(null);
                setOpenDropdown(openDropdown === 'profile' ? null : 'profile');
              }}
            >
              {avatarUrl && avatarUrl !== avatarFailed ? (
                <Image
                  accessibilityLabel={`${userLabel} profile image`}
                  className="h-full w-full"
                  onError={() => setAvatarFailed(avatarUrl)}
                  source={{ uri: avatarUrl }}
                />
              ) : (
                <Text className="text-sm font-bold text-white">{getInitials(userLabel)}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={closeDropdown}
        statusBarTranslucent
        transparent
        visible={openDropdown !== null}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
            onPress={closeDropdown}
          />
          <View
            style={{
              position: 'absolute',
              right: 12,
              top: insets.top + 64,
              width: dropdownWidth,
              maxHeight: height * 0.78,
              overflow: 'hidden',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.panel,
              elevation: 16,
            }}
          >
            {openDropdown === 'profile' ? (
              <ScrollView contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 8, borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: 8, paddingBottom: 12 }}>
                  <Text style={{ color: palette.text, fontWeight: '600' }}>{userLabel}</Text>
                  {user.email ? <Text style={{ marginTop: 4, color: palette.mutedText, fontSize: 12 }}>{user.email}</Text> : null}
                  {avatarQuery.isError ? (
                    <Text accessibilityRole="alert" style={{ marginTop: 8, color: palette.error, fontSize: 12 }}>
                      {avatarQuery.error.message}
                    </Text>
                  ) : null}
                </View>
                <View>
                  {profileMenuItems.map((item) => (
                    <Pressable
                      key={item.label}
                      accessibilityRole="button"
                      style={{ minHeight: 44, justifyContent: 'center', borderRadius: 8, paddingHorizontal: 12 }}
                      onPress={() => {
                        closeDropdown();
                        router.push(item.href);
                      }}
                    >
                      <Text style={{ color: palette.secondaryText, fontSize: 14, fontWeight: '500' }}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {signOutError ? (
                  <Text accessibilityRole="alert" style={{ paddingHorizontal: 8, paddingTop: 8, color: palette.error, fontSize: 14 }}>
                    {signOutError}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  style={{
                    minHeight: 44,
                    justifyContent: 'center',
                    marginTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: palette.border,
                    paddingHorizontal: 12,
                    paddingTop: 8,
                  }}
                  onPress={() => void handleSignOut()}
                >
                  <Text style={{ color: palette.error, fontSize: 14, fontWeight: '600' }}>Sign out</Text>
                </Pressable>
              </ScrollView>
            ) : openDropdown === 'notifications' ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ color: palette.text, fontWeight: '600' }}>Notifications</Text>
                  {unreadCount ? <Text style={{ color: palette.accent, fontSize: 12, fontWeight: '600' }}>{unreadCount} unread</Text> : null}
                </View>
                {notificationsQuery.isPending ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32 }}>
                    <ActivityIndicator accessibilityLabel="Loading notifications" color="#fb923c" />
                  </View>
                ) : notificationsQuery.isError ? (
                  <View accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
                    <Text style={{ color: palette.error, fontSize: 14 }}>Notifications could not be loaded.</Text>
                    <Text style={{ marginTop: 8, color: palette.error, fontSize: 12, lineHeight: 20 }}>
                      {notificationsQuery.error instanceof Error
                        ? notificationsQuery.error.message
                        : 'Please try again.'}
                    </Text>
                    <Pressable accessibilityRole="button" style={{ marginTop: 8, minHeight: 40, justifyContent: 'center' }} onPress={() => void notificationsQuery.refetch()}>
                      <Text style={{ color: palette.text, fontWeight: '600' }}>Try again</Text>
                    </Pressable>
                  </View>
                ) : notifications.length ? (
                  <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                    {notifications.map((notification) => (
                      <Pressable
                        key={notification.id}
                        accessibilityRole="button"
                        style={{
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: palette.border,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                        disabled={markRead.isPending}
                        onPress={() => openNotification(notification)}
                      >
                        <View style={{ width: 8, height: 8, marginTop: 6, marginRight: 12, borderRadius: 4, backgroundColor: '#67e8f9', opacity: notification.is_read ? 0 : 1 }} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ flex: 1, color: palette.text, fontWeight: '600' }} numberOfLines={1}>{notification.title}</Text>
                            <Text style={{ color: palette.mutedText, fontSize: 10 }}>{relativeTime(notification.created_at)}</Text>
                          </View>
                          <Text style={{ marginTop: 4, color: palette.secondaryText, fontSize: 12, lineHeight: 20 }} numberOfLines={2}>
                            {notification.message}
                          </Text>
                          <Text style={{ marginTop: 4, color: palette.mutedText, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                            {notificationCategoryForType(notification.type) ?? 'Update'}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 28 }}>
                    <Text style={{ textAlign: 'center', color: palette.text, fontWeight: '600' }}>You are all caught up</Text>
                    <Text style={{ marginTop: 4, textAlign: 'center', color: palette.mutedText, fontSize: 12 }}>New updates will appear here.</Text>
                  </View>
                )}
                {notificationActionError ? (
                  <Text accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingBottom: 8, color: palette.error, fontSize: 12 }}>
                    {notificationActionError}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  style={{
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderTopWidth: 1,
                    borderTopColor: palette.border,
                    paddingHorizontal: 16,
                  }}
                  onPress={() => {
                    closeDropdown();
                    router.push('/notifications');
                  }}
                >
                  <Text style={{ color: palette.accent, fontWeight: '600' }}>View all notifications</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
