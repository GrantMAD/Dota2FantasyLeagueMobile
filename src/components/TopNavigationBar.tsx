import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
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
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getManagerAvatarUrl, getManagerProfile } from '@/src/features/account/api';
import { getPlayers } from '@/src/features/players/api';
import {
  getNotifications,
  markNotificationRead,
  notificationActionFor,
  notificationCategoryForType,
  type ManagerNotification,
} from '@/src/features/notifications/api';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

type OpenDropdown = 'notifications' | 'profile' | 'search' | null;

const searchDestinations: { label: string; description: string; href: Href }[] = [
  { label: 'Dashboard', description: 'Points, rank, and season overview', href: '/' },
  { label: 'My Team', description: 'Squad, lineup, and transfers', href: '/team' },
  { label: 'Players', description: 'Search professional players', href: '/discover' },
  { label: 'Matches', description: 'Match Center and results', href: '/matches' },
  { label: 'Tournaments', description: 'Tournament schedule and results', href: '/tournaments' },
  { label: 'Gameweeks', description: 'Deadlines and fixtures', href: '/gameweeks' },
  { label: 'Squad Planner', description: 'Availability and upcoming fixtures', href: '/squad-planner' },
  { label: 'Leagues', description: 'Your leagues and standings', href: '/leagues' },
  { label: 'Leaderboard', description: 'Global manager rankings', href: '/leaderboard' },
  { label: 'Analytics', description: 'Performance and market insights', href: '/analytics' },
  { label: 'Season Recap', description: 'Review your season', href: '/season-recap' },
  { label: 'Notifications', description: 'Deadlines, scoring, and league updates', href: '/notifications' },
  { label: 'Learn', description: 'Fantasy learning center', href: '/learn' },
  { label: 'Rules', description: 'Official rules and scoring', href: '/rules' },
  { label: 'Help', description: 'Frequently asked questions', href: '/help' },
  { label: 'Profile', description: 'Manager identity and account settings', href: '/profile' },
  { label: 'Premium Tools', description: 'Planned advanced fantasy tools', href: '/premium' },
];

const profileMenuItems: {
  label: string;
  href: Href;
  icon: ComponentProps<typeof SymbolView>['name'];
}[] = [
  { label: 'Gameweeks', href: '/gameweeks', icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' } },
  { label: 'Squad Planner', href: '/squad-planner', icon: { ios: 'calendar.badge.clock', android: 'event_note', web: 'event_note' } },
  { label: 'Global Leaderboard', href: '/leaderboard', icon: { ios: 'list.number', android: 'leaderboard', web: 'leaderboard' } },
  { label: 'Analytics', href: '/analytics', icon: { ios: 'chart.xyaxis.line', android: 'query_stats', web: 'query_stats' } },
  { label: 'Season Recap', href: '/season-recap', icon: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' } },
  { label: 'Notifications', href: '/notifications', icon: { ios: 'bell', android: 'notifications', web: 'notifications' } },
  { label: 'Learn & Rules', href: '/learn', icon: { ios: 'book.closed', android: 'menu_book', web: 'menu_book' } },
  { label: 'Profile & Settings', href: '/profile', icon: { ios: 'person.crop.circle', android: 'manage_accounts', web: 'manage_accounts' } },
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
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
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
  const playerSearchQuery = useQuery({
    queryKey: ['global-player-search', debouncedSearchText],
    queryFn: () => getPlayers({
      search: debouncedSearchText,
      role: '',
      teamId: null,
      availableOnly: false,
      offset: 0,
      limit: 5,
    }),
    enabled: openDropdown === 'search' && debouncedSearchText.length > 0,
    staleTime: 30_000,
  });

  const metadata = user?.user_metadata;
  const avatarUrl = getAvatarUrl(avatarQuery.data ?? metadata?.avatar_url ?? metadata?.picture);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchText]);

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
        accent: '#5eead4',
        error: '#fca5a5',
      }
    : {
        panel: '#ffffff',
        elevated: '#f1f5f9',
        border: '#cbd5e1',
        text: '#0f172a',
        secondaryText: '#334155',
        mutedText: '#64748b',
        accent: '#0f766e',
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
              accessibilityLabel="Search players and pages"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full"
              onPress={() => {
                setSearchText('');
                setOpenDropdown('search');
              }}
            >
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={22}
                tintColor={colors.tabBarInactive}
              />
            </Pressable>
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
                      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12 }}
                      onPress={() => {
                        closeDropdown();
                        router.push(item.href);
                      }}
                    >
                      <SymbolView name={item.icon} size={18} tintColor={palette.mutedText} />
                      <Text style={{ marginLeft: 12, color: palette.secondaryText, fontSize: 14, fontWeight: '500' }}>{item.label}</Text>
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
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: palette.border,
                    paddingHorizontal: 12,
                    paddingTop: 8,
                  }}
                  onPress={() => void handleSignOut()}
                >
                  <SymbolView
                    name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
                    size={18}
                    tintColor={palette.error}
                  />
                  <Text style={{ marginLeft: 12, color: palette.error, fontSize: 14, fontWeight: '600' }}>Sign out</Text>
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
                    <ActivityIndicator accessibilityLabel="Loading notifications" color="#14b8a6" />
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
            ) : openDropdown === 'search' ? (
              <View style={{ padding: 14 }}>
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
                  Search players and pages
                </Text>
                <TextInput
                  accessibilityLabel="Search players and pages"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setSearchText}
                  placeholder="Find a pro player, page, or feature"
                  placeholderTextColor={palette.mutedText}
                  returnKeyType="search"
                  style={{
                    minHeight: 44,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.elevated,
                    color: palette.text,
                    paddingHorizontal: 12,
                    marginBottom: 8,
                  }}
                  value={searchText}
                />
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {searchText.trim().length > 0 && debouncedSearchText !== searchText.trim() ? (
                    <View style={{ minHeight: 48, justifyContent: 'center' }}>
                      <ActivityIndicator accessibilityLabel="Searching players" color="#14b8a6" />
                    </View>
                  ) : null}
                  {playerSearchQuery.isFetching ? (
                    <View style={{ minHeight: 48, justifyContent: 'center' }}>
                      <ActivityIndicator accessibilityLabel="Searching players" color="#14b8a6" />
                    </View>
                  ) : null}
                  {playerSearchQuery.isError ? (
                    <View accessibilityRole="alert" style={{ paddingVertical: 8 }}>
                      <Text style={{ color: palette.error, fontSize: 12, lineHeight: 18 }}>
                        {playerSearchQuery.error instanceof Error
                          ? playerSearchQuery.error.message
                          : 'Unable to search players.'}
                      </Text>
                      <Pressable accessibilityRole="button" onPress={() => void playerSearchQuery.refetch()}>
                        <Text style={{ color: palette.accent, fontSize: 13, fontWeight: '600', marginTop: 6 }}>
                          Retry player search
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {debouncedSearchText === searchText.trim()
                    ? playerSearchQuery.data?.players.map((player) => (
                    <Pressable
                      key={`player-${player.id}`}
                      accessibilityRole="button"
                      style={{ minHeight: 52, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: 4 }}
                      onPress={() => {
                        closeDropdown();
                        router.push(`/player/${player.id}`);
                      }}
                    >
                      <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>
                        {player.in_game_name || player.name}
                      </Text>
                      <Text style={{ marginTop: 3, color: palette.mutedText, fontSize: 12 }}>
                        {player.team_name || 'Free Agent'} · {player.primary_role || 'Player'}
                        {player.current_price === null ? '' : ` · ${player.current_price.toFixed(1)}M`}
                      </Text>
                    </Pressable>
                    ))
                    : null}
                  {searchDestinations
                    .filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(searchText.trim().toLowerCase()))
                    .slice(0, 8)
                    .map((item) => (
                      <Pressable
                        key={item.label}
                        accessibilityRole="button"
                        style={{ minHeight: 52, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: 4 }}
                        onPress={() => {
                          closeDropdown();
                          router.push(item.href);
                        }}
                      >
                        <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
                        <Text style={{ marginTop: 3, color: palette.mutedText, fontSize: 12 }}>{item.description}</Text>
                      </Pressable>
                    ))}
                  {searchText.trim().length > 0 &&
                  !playerSearchQuery.isPending &&
                  !playerSearchQuery.isError &&
                  !playerSearchQuery.data?.players.length &&
                  !searchDestinations.some((item) => `${item.label} ${item.description}`.toLowerCase().includes(searchText.trim().toLowerCase())) ? (
                    <Text style={{ paddingVertical: 16, textAlign: 'center', color: palette.mutedText, fontSize: 13 }}>
                      No players or pages found.
                    </Text>
                  ) : null}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
