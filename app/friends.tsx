import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView as NativeScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { ScreenScrollView } from '@/src/components/ScreenScrollView';
import {
  getFriendActivity,
  getFriendProgress,
  getFollowing,
  searchFriends,
  setFriendFollow,
  type FriendActivity,
  type FriendProfile,
} from '@/src/features/friends/api';
import { useMobileTheme } from '@/src/lib/theme';

function safeAvatarUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function profileName(profile: Pick<FriendProfile, 'display_name' | 'username'>): string {
  return profile.display_name?.trim() || profile.username;
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

function ProfileAvatar({ url, name }: { url: string | null; name: string }) {
  const uri = safeAvatarUrl(url);
  return uri ? (
    <Image accessibilityLabel={`${name} profile image`} className="mr-3 h-10 w-10 rounded-full" source={{ uri }} />
  ) : (
    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-700">
      <Text className="font-bold text-slate-200">{name.charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

function ActivityCard({
  activity,
  onPressManager,
}: {
  activity: FriendActivity;
  onPressManager: (profile: FriendProfile) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const accents = {
    transfer: { border: 'border-rose-500/30', background: 'bg-rose-500/10', label: 'text-rose-300', icon: '⇄' },
    chip: { border: 'border-purple-500/30', background: 'bg-purple-500/10', label: 'text-purple-300', icon: '✦' },
    lineup: { border: 'border-cyan-500/30', background: 'bg-cyan-500/10', label: 'text-cyan-300', icon: '⚑' },
    gameweek_score: { border: 'border-amber-500/30', background: 'bg-amber-500/10', label: 'text-amber-300', icon: '★' },
  }[activity.activity_type];
  const rankMovement = activity.previous_gameweek_rank !== null && activity.gameweek_rank !== null
    ? activity.previous_gameweek_rank - activity.gameweek_rank
    : null;

  return (
    <View className={`rounded-2xl border ${accents.border} ${accents.background}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${activity.activity_type.replace('_', ' ')} activity by ${activity.username}`}
        accessibilityState={{ expanded }}
        className="flex-row items-center gap-3 p-4"
        onPress={() => setExpanded((current) => !current)}
      >
        <Text className={`text-xl font-bold ${accents.label}`} accessibilityElementsHidden>{accents.icon}</Text>
        <View className="flex-1">
          <Text className="font-semibold text-slate-50">{activity.title}</Text>
          <Text className="mt-1 text-xs text-slate-400">
            {activity.season_name}{activity.gameweek_number === null ? '' : ` · GW ${activity.gameweek_number}`} · {relativeTime(activity.updated_at)}
          </Text>
        </View>
        <Text className="text-sm font-semibold text-slate-400">{expanded ? '−' : '+'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${activity.username} progress`}
        className="flex-row items-center border-t border-slate-700/70 px-4 py-3"
        onPress={() => onPressManager({
          id: activity.user_id,
          username: activity.username,
          display_name: activity.display_name,
          avatar_url: activity.avatar_url,
        })}
      >
        <ProfileAvatar name={profileName({
          username: activity.username,
          display_name: activity.display_name,
        })} url={activity.avatar_url} />
        <View className="flex-1">
          <Text className="font-semibold text-slate-50">{profileName(activity)}</Text>
          <Text className="text-xs text-slate-400">@{activity.username}</Text>
        </View>
        <Text className="text-sm font-semibold text-brand-300">Progress →</Text>
      </Pressable>
      {expanded ? (
        <View className="gap-3 border-t border-slate-700/70 p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
            Activity details
          </Text>
          {activity.activity_type === 'transfer' ? (
            <View className="flex-row gap-2">
              <View className="flex-1 gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Transferred in</Text>
                {activity.players_in?.length ? activity.players_in.map((player, index) => (
                  <Text className="text-sm font-medium text-slate-100" key={`${player}-${index}`}>{player}</Text>
                )) : <Text className="text-xs text-slate-400">No player details</Text>}
              </View>
              <View className="flex-1 gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Transferred out</Text>
                {activity.players_out?.length ? activity.players_out.map((player, index) => (
                  <Text className="text-sm font-medium text-slate-100" key={`${player}-${index}`}>{player}</Text>
                )) : <Text className="text-xs text-slate-400">No player details</Text>}
              </View>
            </View>
          ) : null}
          {activity.activity_type === 'lineup' ? (
            activity.lineup_changes.length ? (
              <View className="gap-2">
                {activity.lineup_changes.map((change, index) => (
                  <View
                    className="gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3"
                    key={`${change.slot}-${index}`}
                  >
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                      {change.slot}
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="flex-1 text-sm text-slate-400">{change.from ?? 'Empty'}</Text>
                      <Text className="text-sm font-bold text-cyan-300">→</Text>
                      <Text className="flex-1 text-right text-sm font-semibold text-slate-100">{change.to ?? 'Empty'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-400">
                No lineup changes were recorded.
              </Text>
            )
          ) : null}
          {activity.activity_type === 'chip' ? (
            <View className="flex-row items-center gap-3 rounded-xl border border-purple-500/25 bg-purple-500/10 p-4">
              <Text className="text-2xl text-purple-300">✦</Text>
              <View className="flex-1 gap-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Chip activated</Text>
                <Text className="text-base font-bold text-slate-50">{activity.chip ?? 'Chip details unavailable'}</Text>
              </View>
            </View>
          ) : null}
          {activity.activity_type === 'gameweek_score' ? (
            <>
              <View className="flex-row flex-wrap gap-2">
                {[
                  ...(activity.gameweek_number !== null && activity.gameweek_points !== null
                    ? [{ label: `GAMEWEEK ${activity.gameweek_number}`, value: `${activity.gameweek_points} pts`, highlight: true }]
                    : []),
                  ...(activity.total_points !== null
                    ? [{ label: 'SEASON TOTAL', value: `${activity.total_points.toLocaleString()} pts`, highlight: false }]
                    : []),
                  ...(activity.gameweek_rank !== null
                    ? [{ label: 'GAMEWEEK RANK', value: `#${activity.gameweek_rank.toLocaleString()}`, highlight: false }]
                    : []),
                  ...(activity.global_rank !== null
                    ? [{ label: 'GLOBAL RANK', value: `#${activity.global_rank.toLocaleString()}`, highlight: false }]
                    : []),
                ].map((stat) => (
                  <View
                    className={`min-w-[45%] flex-1 gap-1 rounded-xl border p-3 ${
                      stat.highlight
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-900/70'
                    }`}
                    key={stat.label}
                  >
                    <Text className="text-[10px] font-bold tracking-wider text-slate-400">{stat.label}</Text>
                    <Text className={`text-lg font-bold ${stat.highlight ? 'text-amber-300' : 'text-slate-100'}`}>
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>
              {rankMovement !== null ? (
                <View className="flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                  <Text className="text-xs font-semibold text-slate-400">Rank movement</Text>
                  <Text className={`text-sm font-bold ${
                    rankMovement > 0 ? 'text-emerald-300' : rankMovement < 0 ? 'text-rose-300' : 'text-slate-300'
                  }`}>
                    {rankMovement > 0
                      ? `↑ Up ${rankMovement} ${rankMovement === 1 ? 'place' : 'places'}`
                      : rankMovement < 0
                        ? `↓ Down ${Math.abs(rankMovement)} ${Math.abs(rankMovement) === 1 ? 'place' : 'places'}`
                        : 'No change'}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function FriendsScreen() {
  const [now] = useState(() => Date.now());
  const { colors, theme } = useMobileTheme();
  const modalColors = theme === 'dark'
    ? {
        backdrop: 'rgba(0, 0, 0, 0.6)',
        surface: '#020617',
        card: '#0f172a',
        border: '#334155',
        text: '#f8fafc',
        secondary: '#cbd5e1',
        muted: '#94a3b8',
        accent: '#2dd4bf',
        selected: '#042f2e',
      }
    : {
        backdrop: 'rgba(15, 23, 42, 0.3)',
        surface: '#e8eef5',
        card: '#f8fafc',
        border: '#cbd5e1',
        text: '#334d64',
        secondary: '#334155',
        muted: '#475569',
        accent: '#0d9488',
        selected: '#ccfbf1',
      };
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedManager, setSelectedManager] = useState<FriendProfile | null>(null);
  const [olderActivities, setOlderActivities] = useState<FriendActivity[]>([]);
  const [feedError, setFeedError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const followingQuery = useQuery({
    queryKey: ['friends', 'following'],
    queryFn: getFollowing,
    staleTime: 30_000,
  });
  const feedQuery = useQuery({
    queryKey: ['friends', 'feed'],
    queryFn: () => getFriendActivity(),
    staleTime: 30_000,
  });
  const searchQuery = useQuery({
    queryKey: ['friends', 'search', debouncedSearch],
    queryFn: () => searchFriends(debouncedSearch),
    enabled: debouncedSearch.replace(/\s/g, '').length >= 2,
    staleTime: 30_000,
  });
  const progressQuery = useQuery({
    queryKey: ['friends', 'progress', selectedManager?.id],
    queryFn: () => getFriendProgress(selectedManager!.id),
    enabled: selectedManager !== null && (followingQuery.data ?? []).some((profile) => profile.id === selectedManager.id),
    staleTime: 30_000,
  });
  const loadMoreMutation = useMutation({
    mutationFn: getFriendActivity,
    onSuccess: (page) => {
      setOlderActivities((current) => [...current, ...page.activities]);
      setFeedError(null);
    },
    onError: (error) => setFeedError(error instanceof Error ? error.message : 'Unable to load more activity.'),
  });
  const followMutation = useMutation({
    mutationFn: ({ userId, follow }: { userId: string; follow: boolean }) => setFriendFollow(userId, follow),
    onSuccess: async (_result, variables) => {
      setOlderActivities([]);
      loadMoreMutation.reset();
      if (!variables.follow) {
        setSelectedManager((current) => current?.id === variables.userId ? null : current);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['friends', 'following'] }),
        queryClient.invalidateQueries({ queryKey: ['friends', 'search'] }),
        queryClient.invalidateQueries({ queryKey: ['friends', 'feed'] }),
      ]);
    },
  });
  const following = followingQuery.data ?? [];
  const followingIds = new Set(following.map((profile) => profile.id));
  const searchResults = searchQuery.data ?? [];
  const activities = [...(feedQuery.data?.activities ?? []), ...olderActivities];
  const cutoff = now - 3 * 24 * 60 * 60 * 1000;
  const recentActivities = activities.filter((activity) => Date.parse(activity.updated_at) >= cutoff);
  const olderFeedActivities = activities.filter((activity) => Date.parse(activity.updated_at) < cutoff);
  const nextCursor = loadMoreMutation.isSuccess
    ? loadMoreMutation.data.nextCursor
    : feedQuery.data?.nextCursor ?? null;
  const loadError = followingQuery.error ?? feedQuery.error;

  function refresh() {
    setOlderActivities([]);
    loadMoreMutation.reset();
    setFeedError(null);
    void Promise.all([followingQuery.refetch(), feedQuery.refetch()]);
  }

  function toggleFollow(profile: FriendProfile) {
    followMutation.mutate({
      userId: profile.id,
      follow: !(profile.is_following ?? followingIds.has(profile.id)),
    });
  }

  return (
    <Screen>
      <ScreenScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={followingQuery.isRefetching || feedQuery.isRefetching}
            onRefresh={refresh}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Community</Text>
          <Text className="mt-2 text-3xl font-bold text-slate-50">Friends</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Follow other managers to keep up with their transfers, lineups, chips, and scores.
          </Text>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <SymbolView
              name={{ ios: 'person.crop.badge.magnifyingglass', android: 'person_search', web: 'person_search' }}
              size={19}
              tintColor="#2dd4bf"
              accessibilityLabel="Find managers"
            />
            <Text className="text-lg font-bold text-slate-50">Find managers</Text>
          </View>
          <TextInput
            accessibilityLabel="Search managers"
            autoCapitalize="none"
            autoCorrect={false}
            className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-base text-slate-50"
            onChangeText={setSearch}
            placeholder="Search username or display name"
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
            value={search}
          />
          {search.trim().replace(/\s/g, '').length < 2 ? (
            <Text className="text-sm text-slate-500">Enter at least 2 characters to search.</Text>
          ) : searchQuery.isLoading ? (
            <ActivityIndicator accessibilityLabel="Searching managers" color="#14b8a6" />
          ) : searchQuery.error ? (
            <Text accessibilityRole="alert" className="text-sm text-red-300">{searchQuery.error.message}</Text>
          ) : searchResults.length ? (
            <View className="gap-2">
              {searchResults.map((profile) => {
                const isFollowing = profile.is_following ?? followingIds.has(profile.id);
                return (
                  <View className="gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" key={profile.id}>
                    <View className="flex-row items-center">
                      <ProfileAvatar name={profileName(profile)} url={profile.avatar_url} />
                      <View className="ml-3 flex-1">
                        <Text className="font-semibold text-slate-50">{profileName(profile)}</Text>
                        <Text className="text-sm text-slate-400">@{profile.username}</Text>
                      </View>
                    </View>
                    <View className="flex-row justify-end gap-2">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${profileName(profile)} progress`}
                        className="min-h-10 items-center justify-center rounded-lg border border-brand-500/50 bg-brand-500/10 px-3"
                        onPress={() => setSelectedManager(profile)}
                      >
                        <Text className="whitespace-nowrap font-semibold text-brand-300">View progress</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: followMutation.isPending }}
                        className={`min-h-10 items-center justify-center rounded-lg px-4 ${isFollowing ? 'bg-slate-700' : 'bg-brand-500'}`}
                        disabled={followMutation.isPending}
                        onPress={() => toggleFollow(profile)}
                      >
                        <Text className={isFollowing ? 'font-semibold text-slate-200' : 'font-semibold text-on-accent'}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : searchQuery.isFetched ? (
            <Text className="text-sm text-slate-400">No managers found.</Text>
          ) : null}
          {followMutation.error ? (
            <Text accessibilityRole="alert" className="text-sm text-red-300">
              {followMutation.error.message}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <SymbolView
                  name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                  size={19}
                  tintColor="#2dd4bf"
                  accessibilityLabel="Following"
                />
                <Text className="text-lg font-bold text-slate-50">Following</Text>
              </View>
              <Text className="text-sm text-slate-400">{following.length} managers</Text>
            </View>
            <Text className="mt-1 text-xs text-slate-400">
              Click any friend below to view their season points, global rank, and gameweek history.
            </Text>
          </View>
          {followingQuery.isLoading ? (
            <ActivityIndicator accessibilityLabel="Loading followed managers" color="#14b8a6" />
          ) : following.length ? (
            <View className="gap-2">
              {following.map((profile) => (
                <View
                  className="gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4"
                  key={profile.id}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${profileName(profile)} profile`}
                    className="flex-row items-center gap-4"
                    onPress={() => setSelectedManager(profile)}
                  >
                    <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-700">
                      {safeAvatarUrl(profile.avatar_url) ? (
                        <Image
                          accessibilityLabel={`${profileName(profile)} profile image`}
                          className="h-14 w-14 rounded-full"
                          source={{ uri: safeAvatarUrl(profile.avatar_url) ?? undefined }}
                        />
                      ) : (
                        <Text className="text-xl font-bold text-slate-200">
                          {profileName(profile).charAt(0).toUpperCase() || '?'}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1 gap-1">
                      <Text numberOfLines={1} className="text-base font-bold text-slate-50">{profileName(profile)}</Text>
                      <Text numberOfLines={1} className="text-sm text-slate-400">@{profile.username}</Text>
                      <Text className="mt-1 text-xs font-semibold text-brand-300">View season progress</Text>
                    </View>
                  </Pressable>
                  <View className="flex-row gap-3 border-t border-slate-700 pt-3">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${profileName(profile)} progress`}
                      className="min-h-11 flex-1 items-center justify-center rounded-xl border border-brand-500/40 bg-brand-500/10 px-4"
                      onPress={() => setSelectedManager(profile)}
                    >
                      <Text className="font-semibold text-brand-300">View progress</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unfollow ${profileName(profile)}`}
                      className="min-h-11 items-center justify-center rounded-xl bg-slate-700 px-4"
                      disabled={followMutation.isPending}
                      onPress={() => toggleFollow({ ...profile, is_following: true })}
                    >
                      <Text className="font-semibold text-slate-200">Unfollow</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
              You are not following any managers yet. Search above to get started.
            </Text>
          )}
        </View>

        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <SymbolView
              name={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
              size={19}
              tintColor="#2dd4bf"
              accessibilityLabel="Activity feed"
            />
            <Text className="text-lg font-bold text-slate-50">Activity feed</Text>
          </View>
          {feedQuery.isLoading ? (
            <ActivityIndicator accessibilityLabel="Loading friends activity" color="#14b8a6" />
          ) : activities.length ? (
            <View className="gap-3">
              {recentActivities.length ? (
                <View className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-slate-50">Recent activity</Text>
                    <Text className="text-xs text-slate-400">{recentActivities.length} updates</Text>
                  </View>
                  {recentActivities.map((activity) => (
                    <ActivityCard activity={activity} key={activity.activity_id} onPressManager={setSelectedManager} />
                  ))}
                </View>
              ) : null}
              {olderFeedActivities.length ? (
                <View className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-slate-50">Older activity</Text>
                    <Text className="text-xs text-slate-400">{olderFeedActivities.length} updates</Text>
                  </View>
                  {olderFeedActivities.map((activity) => (
                    <ActivityCard activity={activity} key={activity.activity_id} onPressManager={setSelectedManager} />
                  ))}
                </View>
              ) : null}
              {feedError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{feedError}</Text> : null}
              {nextCursor ? (
                <Pressable
                  accessibilityRole="button"
                  className="min-h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900"
                  disabled={loadMoreMutation.isPending}
                  onPress={() => loadMoreMutation.mutate(nextCursor)}
                >
                  {loadMoreMutation.isPending
                    ? <ActivityIndicator color="#14b8a6" />
                    : <Text className="font-semibold text-brand-300">Load more activity</Text>}
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
              {following.length
                ? 'New manager activity will appear here as it happens.'
                : 'Follow managers to see their fantasy activity here.'}
            </Text>
          )}
          {feedQuery.isError ? (
            <Pressable
              accessibilityRole="button"
              className="min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900"
              onPress={() => void feedQuery.refetch()}
            >
              <Text className="font-semibold text-brand-300">Retry activity feed</Text>
            </Pressable>
          ) : null}
        </View>
        {loadError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{loadError.message}</Text> : null}
      </ScreenScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedManager(null)}
        transparent
        visible={selectedManager !== null}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: modalColors.backdrop }}>
          <View
            className="max-h-[88%] rounded-t-3xl border px-5 pb-8 pt-3"
            style={{
              backgroundColor: modalColors.surface,
              borderColor: modalColors.border,
              maxHeight: '88%',
            }}
          >
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full" style={{ backgroundColor: modalColors.border }} />
            </View>
            <NativeScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-5 pb-2">
                <View className="flex-row items-center justify-between gap-3">
                  <View>
                    <Text
                      className="text-xs font-bold uppercase tracking-[2px]"
                      style={{ color: modalColors.accent }}
                    >
                      Manager progress
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: modalColors.muted }}>
                      Season overview and gameweek history
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close manager progress"
                    className="h-10 w-10 items-center justify-center rounded-full border"
                    style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                    onPress={() => setSelectedManager(null)}
                  >
                    <Text className="text-xl" style={{ color: modalColors.secondary }}>×</Text>
                  </Pressable>
                </View>

                <View
                  className="flex-row items-center gap-4 rounded-2xl border p-4"
                  style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                >
                  {selectedManager && safeAvatarUrl(selectedManager.avatar_url) ? (
                    <Image
                      accessibilityLabel={`${profileName(selectedManager)} profile image`}
                      className="h-20 w-20 rounded-full"
                      source={{ uri: safeAvatarUrl(selectedManager.avatar_url) ?? undefined }}
                    />
                  ) : (
                    <View
                      className="h-20 w-20 items-center justify-center rounded-full"
                      style={{ backgroundColor: modalColors.selected }}
                    >
                      <Text className="text-3xl font-bold" style={{ color: modalColors.accent }}>
                        {selectedManager ? profileName(selectedManager).charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1 gap-1">
                    <Text className="text-xl font-bold" style={{ color: modalColors.text }}>
                      {selectedManager ? profileName(progressQuery.data?.manager ?? selectedManager) : ''}
                    </Text>
                    {selectedManager ? (
                      <Text className="text-sm" style={{ color: modalColors.muted }}>
                        @{progressQuery.data?.manager.username ?? selectedManager.username}
                      </Text>
                    ) : null}
                    {progressQuery.data?.season ? (
                      <View className="mt-2 self-start rounded-full px-3 py-1" style={{ backgroundColor: modalColors.selected }}>
                        <Text className="text-xs font-bold" style={{ color: modalColors.accent }}>
                          {progressQuery.data.season.name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {followingQuery.isLoading ? (
                  <ActivityIndicator accessibilityLabel="Checking follow status" color="#14b8a6" />
                ) : followingQuery.error ? (
                  <View
                    className="gap-3 rounded-2xl border p-4"
                    style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                  >
                    <Text accessibilityRole="alert" className="text-sm" style={{ color: '#b91c1c' }}>
                      {followingQuery.error.message}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      className="self-start rounded-lg px-4 py-2"
                      style={{ backgroundColor: modalColors.selected }}
                      onPress={() => void followingQuery.refetch()}
                    >
                      <Text className="font-semibold" style={{ color: modalColors.accent }}>Try again</Text>
                    </Pressable>
                  </View>
                ) : selectedManager && !followingIds.has(selectedManager.id) ? (
                  <View
                    className="gap-3 rounded-2xl border p-4"
                    style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                  >
                    <Text className="text-base font-bold" style={{ color: modalColors.text }}>
                      Follow {profileName(selectedManager)} to view their progress
                    </Text>
                    <Text className="text-sm leading-5" style={{ color: modalColors.muted }}>
                      Following this manager lets you see their season points, global rank, and gameweek history.
                    </Text>
                    {followMutation.error ? (
                      <Text accessibilityRole="alert" className="text-sm" style={{ color: '#b91c1c' }}>
                        {followMutation.error.message}
                      </Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: followMutation.isPending }}
                      className="min-h-11 flex-row items-center justify-center gap-2 self-start rounded-xl px-5"
                      disabled={followMutation.isPending}
                      style={{ backgroundColor: modalColors.accent, opacity: followMutation.isPending ? 0.65 : 1 }}
                      onPress={() => toggleFollow(selectedManager)}
                    >
                      {followMutation.isPending ? (
                        <ActivityIndicator color={theme === 'dark' ? '#f8fafc' : '#ffffff'} />
                      ) : null}
                      <Text className="font-semibold" style={{ color: '#ffffff' }}>
                        {followMutation.isPending ? 'Following…' : `Follow ${profileName(selectedManager)}`}
                      </Text>
                    </Pressable>
                  </View>
                ) : progressQuery.isLoading ? (
                  <ActivityIndicator accessibilityLabel="Loading manager progress" color="#14b8a6" />
                ) : progressQuery.error ? (
                  <View
                    className="gap-3 rounded-2xl border p-4"
                    style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                  >
                    <Text accessibilityRole="alert" className="text-sm" style={{ color: '#b91c1c' }}>
                      {progressQuery.error.message}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      className="self-start rounded-lg px-4 py-2"
                      style={{ backgroundColor: modalColors.selected }}
                      onPress={() => void progressQuery.refetch()}
                    >
                      <Text className="font-semibold" style={{ color: modalColors.accent }}>Try again</Text>
                    </Pressable>
                  </View>
                ) : progressQuery.data?.season ? (
                  <>
                    <View className="flex-row gap-3">
                      {[
                        {
                          label: 'SEASON POINTS',
                          value: `${progressQuery.data.season.total_points.toLocaleString()} points`,
                        },
                        {
                          label: 'GLOBAL RANK',
                          value: progressQuery.data.season.global_rank === null
                            ? '—'
                            : `#${progressQuery.data.season.global_rank.toLocaleString()}`,
                        },
                      ].map((stat) => (
                        <View
                          className="min-h-24 flex-1 justify-center gap-2 rounded-2xl border px-4 py-3"
                          key={stat.label}
                          style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                        >
                          <Text className="text-[10px] font-bold tracking-wider" style={{ color: modalColors.muted }}>
                            {stat.label}
                          </Text>
                          <Text className="text-lg font-bold" style={{ color: modalColors.text }}>{stat.value}</Text>
                        </View>
                      ))}
                    </View>

                    <View className="gap-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-bold" style={{ color: modalColors.text }}>Gameweek history</Text>
                        <Text className="text-xs" style={{ color: modalColors.muted }}>
                          {progressQuery.data.season.gameweeks.length} weeks
                        </Text>
                      </View>
                      <Text className="text-xs leading-5" style={{ color: modalColors.muted }}>
                        Only closed gameweeks are shown. The active gameweek will appear once it closes.
                      </Text>
                      {progressQuery.data.season.gameweeks.length ? (
                        <View className="gap-2">
                          {progressQuery.data.season.gameweeks.map((gameweek) => (
                            <View
                              className="flex-row items-center justify-between rounded-xl border px-4 py-3"
                              key={gameweek.id}
                              style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                            >
                              <View>
                                <Text className="font-semibold" style={{ color: modalColors.text }}>
                                  Gameweek {gameweek.gameweek_number}
                                </Text>
                                <Text className="mt-1 text-xs" style={{ color: modalColors.muted }}>
                                  {gameweek.total_points.toLocaleString()} season points
                                </Text>
                              </View>
                              <View className="items-end">
                                <Text className="font-semibold" style={{ color: modalColors.accent }}>
                                  +{gameweek.gameweek_points} pts
                                </Text>
                                <Text className="mt-1 text-xs" style={{ color: modalColors.muted }}>
                                  Rank #{gameweek.rank.toLocaleString()}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text
                          className="rounded-xl border p-4 text-sm"
                          style={{ backgroundColor: modalColors.card, borderColor: modalColors.border, color: modalColors.muted }}
                        >
                          No completed gameweek results yet.
                        </Text>
                      )}
                    </View>
                  </>
                ) : progressQuery.isFetched ? (
                  <Text
                    className="rounded-xl border p-4 text-sm"
                    style={{ backgroundColor: modalColors.card, borderColor: modalColors.border, color: modalColors.muted }}
                  >
                    No season progress is available yet.
                  </Text>
                ) : null}
              </View>
            </NativeScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
