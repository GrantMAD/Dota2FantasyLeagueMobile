import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { getPlayerDetail } from '@/src/features/players/api';

function displayName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export default function ComparePlayersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ids?: string }>();
  const ids = [...new Set((params.ids ?? '')
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0))].slice(0, 3);
  const query = useQuery({
    queryKey: ['player-comparison', ids],
    queryFn: () => Promise.all(ids.map(getPlayerDetail)),
    enabled: ids.length >= 2,
    staleTime: 60_000,
  });

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#fb923c" />
        }
      >
        <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start" onPress={() => router.back()}>
          <Text className="font-semibold text-brand-300">‹  Back</Text>
        </Pressable>
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-cyan-300">Player analysis</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Compare players</Text>
        </View>
        {ids.length < 2 ? (
          <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <Text className="font-semibold text-white">Choose at least two players</Text>
            <Text className="text-sm leading-5 text-slate-400">Select players from Discover to compare them side by side.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/discover')}>
              <Text className="font-semibold text-brand-300">Go to Discover</Text>
            </Pressable>
          </View>
        ) : query.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading player comparison" color="#fb923c" />
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Comparison unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load player comparison.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
              {query.data.map((player) => (
                <Pressable
                  key={player.id}
                  accessibilityRole="button"
                  className="w-56 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  onPress={() => router.push(`/player/${player.id}`)}
                >
                  <Text className="font-bold text-white">{displayName(player)}</Text>
                  <Text className="mt-1 text-xs text-slate-400">{player.team_name ?? 'Free agent'}</Text>
                  <Text className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-300">
                    {player.primary_role ?? 'Role unavailable'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <ComparisonRow label="Availability" values={query.data.map((player) => player.availability_status ?? 'Unknown')} />
              <ComparisonRow label="Price" values={query.data.map((player) => `${player.current_price?.toFixed(1) ?? '—'}M`)} />
              <ComparisonRow label="Season points" values={query.data.map((player) => `${player.total_season_points.toFixed(1)}`)} />
              <ComparisonRow label="Latest gameweek" values={query.data.map((player) => `${player.last_gw_points.toFixed(1)}`)} />
              <ComparisonRow label="Recent average" values={query.data.map((player) => `${player.recent_points.toFixed(1)}`)} />
              <ComparisonRow label="Ownership" values={query.data.map((player) => `${player.ownership_percentage.toFixed(1)}%`)} />
            </View>
            <Text className="text-xs leading-5 text-slate-500">
              Values are read from the shared player and scoring APIs. Advanced premium analytics are not included here.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ComparisonRow({ label, values }: { label: string; values: string[] }) {
  return (
    <View className="flex-row border-b border-slate-800 px-3 py-3">
      <Text className="w-28 text-xs font-medium text-slate-400">{label}</Text>
      {values.map((value, index) => (
        <Text key={`${label}-${index}`} className="flex-1 text-center text-xs font-semibold text-slate-200">
          {value}
        </Text>
      ))}
    </View>
  );
}
