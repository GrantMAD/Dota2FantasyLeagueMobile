import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { Screen } from '@/src/components/Screen';
import { getPlayerDetail } from '@/src/features/players/api';

function displayName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export default function PlayerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = Number(params.id);
  const validId = Number.isInteger(playerId) && playerId > 0;
  const query = useQuery({
    queryKey: ['player-detail', playerId],
    queryFn: () => getPlayerDetail(playerId),
    enabled: validId,
    staleTime: 60_000,
  });

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#14b8a6" />
        }
      >
        <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start" onPress={() => router.back()}>
          <Text className="font-semibold text-brand-300">‹  Back to Discover</Text>
        </Pressable>

        {!validId ? (
          <View accessibilityRole="alert" className="rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Invalid player</Text>
          </View>
        ) : query.isPending ? (
          <View accessibilityLabel="Loading player details" className="gap-3">
            <View className="h-36 rounded-2xl bg-slate-800" />
            <View className="h-40 rounded-2xl bg-slate-800" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Player details unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load player details.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data ? (
          <>
            <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <View className="flex-row items-center gap-4">
                <PlayerAvatar uri={query.data.profile_image_url} label={displayName(query.data)} size={76} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold uppercase tracking-wider text-brand-300">
                    {query.data.primary_role ?? 'Role unavailable'}
                  </Text>
                  <Text className="mt-2 text-2xl font-bold text-white">{displayName(query.data)}</Text>
                  {query.data.in_game_name && query.data.name !== query.data.in_game_name ? (
                    <Text className="mt-1 text-sm text-slate-400">{query.data.name}</Text>
                  ) : null}
                  <Text className="mt-2 text-sm text-slate-300">
                    {query.data.team_name ?? 'Free agent'}
                    {query.data.country ? ` · ${query.data.country}` : ''}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Metric label="Price" value={`${query.data.current_price?.toFixed(1) ?? '—'}M`} />
                <Metric label="Season" value={`${query.data.total_season_points.toFixed(1)} pts`} />
                <Metric label="Latest GW" value={`${query.data.last_gw_points.toFixed(1)} pts`} />
                <Metric label="Owned by" value={`${query.data.ownership_percentage.toFixed(1)}%`} />
              </View>
              <View className={`self-start rounded-full px-3 py-1 ${
                query.data.availability_status === 'available' ? 'bg-emerald-500/15' : 'bg-amber-500/15'
              }`}>
                <Text className={`text-xs font-semibold ${
                  query.data.availability_status === 'available' ? 'text-emerald-300' : 'text-amber-200'
                }`}>
                  {query.data.availability_status ?? 'Availability unknown'}
                </Text>
              </View>
              {query.data.availability_reason ? (
                <Text className="text-sm leading-5 text-amber-200/80">{query.data.availability_reason}</Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                className="min-h-11 items-center justify-center rounded-xl border border-cyan-700/60 bg-cyan-950/40"
                onPress={() => router.push(`/compare-players?ids=${query.data.id}`)}
              >
                <Text className="font-semibold text-cyan-200">Compare this player</Text>
              </Pressable>
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-xl font-bold text-white">Recent performances</Text>
                <Text className="mt-1 text-sm text-slate-400">Latest match records from the shared scoring data.</Text>
              </View>
              {query.data.performances.length ? query.data.performances.map((performance) => (
                <View key={performance.id} className="flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <View>
                    <Text className="font-semibold text-white">Gameweek {performance.gameweek_id}</Text>
                    <Text className="mt-1 text-xs text-slate-400">
                      {performance.kills ?? '—'} K · {performance.deaths ?? '—'} D · {performance.assists ?? '—'} A
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-emerald-300">{performance.total_points.toFixed(1)} pts</Text>
                </View>
              )) : (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm text-slate-400">No recorded performances yet.</Text>
                </View>
              )}
            </View>
          </>
        ) : null}
        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Refreshing player details" color="#14b8a6" /> : null}
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-20 flex-1 rounded-lg bg-slate-950 px-3 py-2">
      <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-slate-200">{value}</Text>
    </View>
  );
}
