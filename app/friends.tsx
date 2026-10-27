import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  return (
    <View className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${activity.username} progress`}
        className="mb-3 flex-row items-center justify-between"
        onPress={() => onPressManager({
          id: activity.user_id,
          username: activity.username,
          display_name: activity.display_name,
          avatar_url: activity.avatar_url,
        })}
      >
        <View className="flex-1">
          <Text className="font-semibold text-slate-50">{profileName(activity)}</Text>
          <Text className="text-xs text-slate-400">@{activity.username} · {relativeTime(activity.updated_at)}</Text>
        </View>
        <Text className="text-sm font-semibold text-brand-300">Progress →</Text>
      </Pressable>
      <Text className="font-semibold text-slate-100">{activity.title}</Text>
      {activity.activity_type === 'transfer' ? (
        <View className="mt-2 gap-1">
          {activity.players_in?.length ? <Text className="text-sm text-emerald-300">Bought: {activity.players_in.join(', ')}</Text> : null}
          {activity.players_out?.length ? <Text className="text-sm text-orange-300">Sold: {activity.players_out.join(', ')}</Text> : null}
        </View>
      ) : null}
      {activity.activity_type === 'lineup' && activity.lineup_changes.length ? (
        <View className="mt-2 gap-1">
          {activity.lineup_changes.map((change, index) => (
            <Text className="text-sm text-slate-300" key={`${change.slot}-${index}`}>
              {change.slot}: {change.from ?? 'Empty'} → {change.to ?? 'Empty'}
            </Text>
          ))}
        </View>
      ) : null}
      {activity.activity_type === 'chip' && activity.chip ? (
        <Text className="mt-2 text-sm text-cyan-300">{activity.chip}</Text>
      ) : null}
      {activity.activity_type === 'gameweek_score' ? (
        <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
          {activity.gameweek_number !== null && activity.gameweek_points !== null
            ? <Text className="text-sm text-brand-300">GW{activity.gameweek_number}: {activity.gameweek_points} pts</Text>
            : null}
          {activity.total_points !== null ? <Text className="text-sm text-slate-300">Season: {activity.total_points} pts</Text> : null}
          {activity.gameweek_rank !== null ? <Text className="text-sm text-slate-300">GW rank: #{activity.gameweek_rank}</Text> : null}
          {activity.global_rank !== null ? <Text className="text-sm text-slate-300">Overall: #{activity.global_rank}</Text> : null}
        </View>
      ) : null}
      {activity.season_name ? <Text className="mt-3 text-xs text-slate-500">{activity.season_name}</Text> : null}
    </View>
  );
}

export default function FriendsScreen() {
  const { colors } = useMobileTheme();
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
    enabled: selectedManager !== null,
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
          <Text className="text-lg font-bold text-slate-50">Find managers</Text>
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
                  <View className="flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" key={profile.id}>
                    <View className="mr-3 flex-1 flex-row items-center">
                      <ProfileAvatar name={profileName(profile)} url={profile.avatar_url} />
                      <View className="flex-1">
                        <Text className="font-semibold text-slate-50">{profileName(profile)}</Text>
                        <Text className="text-sm text-slate-400">@{profile.username}</Text>
                      </View>
                    </View>
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
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-50">Following</Text>
            <Text className="text-sm text-slate-400">{following.length} managers</Text>
          </View>
          {followingQuery.isLoading ? (
            <ActivityIndicator accessibilityLabel="Loading followed managers" color="#14b8a6" />
          ) : following.length ? (
            <View className="gap-2">
              {following.map((profile) => (
                <View
                  className="flex-row items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                  key={profile.id}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${profileName(profile)} progress`}
                    className="mr-3 flex-1 flex-row items-center"
                    onPress={() => setSelectedManager(profile)}
                  >
                    <ProfileAvatar name={profileName(profile)} url={profile.avatar_url} />
                    <View className="flex-1">
                      <Text className="font-semibold text-slate-50">{profileName(profile)}</Text>
                      <Text className="text-sm text-slate-400">@{profile.username}</Text>
                    </View>
                    <Text className="text-sm font-semibold text-brand-300">Progress</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Unfollow ${profileName(profile)}`}
                    className="min-h-10 items-center justify-center rounded-lg bg-slate-700 px-3"
                    disabled={followMutation.isPending}
                    onPress={() => toggleFollow({ ...profile, is_following: true })}
                  >
                    <Text className="text-xs font-semibold text-slate-200">Unfollow</Text>
                  </Pressable>
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
          <Text className="text-lg font-bold text-slate-50">Activity feed</Text>
          {feedQuery.isLoading ? (
            <ActivityIndicator accessibilityLabel="Loading friends activity" color="#14b8a6" />
          ) : activities.length ? (
            <View className="gap-3">
              {activities.map((activity) => (
                <ActivityCard
                  activity={activity}
                  key={activity.activity_id}
                  onPressManager={setSelectedManager}
                />
              ))}
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
        </View>
        {loadError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{loadError.message}</Text> : null}
      </ScreenScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedManager(null)}
        visible={selectedManager !== null}
      >
        <Screen>
          <ScreenScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Manager progress</Text>
                <Text className="mt-2 text-2xl font-bold text-slate-50">
                  {selectedManager ? profileName(selectedManager) : ''}
                </Text>
                {selectedManager ? <Text className="text-sm text-slate-400">@{selectedManager.username}</Text> : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close manager progress"
                className="min-h-10 min-w-10 items-center justify-center rounded-lg bg-slate-800"
                onPress={() => setSelectedManager(null)}
              >
                <Text className="text-lg font-semibold text-slate-50">×</Text>
              </Pressable>
            </View>
            {progressQuery.isLoading ? (
              <ActivityIndicator accessibilityLabel="Loading manager progress" color="#14b8a6" />
            ) : progressQuery.error ? (
              <Text accessibilityRole="alert" className="text-sm text-red-300">{progressQuery.error.message}</Text>
            ) : progressQuery.data?.season ? (
              <View className="gap-4">
                <View className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <Text className="text-sm text-slate-400">{progressQuery.data.season.name}</Text>
                  <Text className="mt-1 text-3xl font-bold text-slate-50">
                    {progressQuery.data.season.total_points.toLocaleString()} points
                  </Text>
                  <Text className="mt-1 text-sm text-brand-300">
                    {progressQuery.data.season.global_rank === null
                      ? 'Global rank unavailable'
                      : `Global rank #${progressQuery.data.season.global_rank.toLocaleString()}`}
                  </Text>
                </View>
                <Text className="text-lg font-bold text-slate-50">Gameweek history</Text>
                {progressQuery.data.season.gameweeks.length ? (
                  <View className="gap-2">
                    {progressQuery.data.season.gameweeks.map((gameweek) => (
                      <View className="flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" key={gameweek.id}>
                        <View>
                          <Text className="font-semibold text-slate-50">Gameweek {gameweek.gameweek_number}</Text>
                          <Text className="text-xs text-slate-400">{gameweek.total_points.toLocaleString()} season points</Text>
                        </View>
                        <View className="items-end">
                          <Text className="font-semibold text-brand-300">+{gameweek.gameweek_points} pts</Text>
                          <Text className="text-xs text-slate-400">Rank #{gameweek.rank.toLocaleString()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-sm text-slate-400">No completed gameweek results yet.</Text>
                )}
              </View>
            ) : progressQuery.isFetched ? (
              <Text className="text-sm text-slate-400">No season progress is available yet.</Text>
            ) : null}
          </ScreenScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}
