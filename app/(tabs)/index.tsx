import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { MetricCard } from '@/src/components/MetricCard';
import { Screen } from '@/src/components/Screen';
import { useFantasyContext } from '@/src/features/fantasy/hooks';

function formatMetric(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

export default function HomeScreen() {
  const query = useFantasyContext();

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            accessibilityLabel="Refresh fantasy dashboard"
            onRefresh={() => void query.refetch()}
            refreshing={query.isRefetching}
            tintColor="#fb923c"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Fantasy Dota 2</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Your dashboard</Text>
          <Text className="mt-1 text-sm text-slate-400">Your fantasy team, at a glance.</Text>
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading fantasy dashboard" className="gap-3">
            <View className="h-28 rounded-2xl bg-slate-800" />
            <View className="flex-row gap-3">
              <View className="h-28 flex-1 rounded-2xl bg-slate-800" />
              <View className="h-28 flex-1 rounded-2xl bg-slate-800" />
            </View>
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Dashboard unavailable</Text>
            <Text className="mt-2 text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Please try again.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-4 min-h-11 justify-center"
              onPress={() => void query.refetch()}
            >
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data ? (
          <>
            <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-sm font-medium text-slate-400">Season points</Text>
              <Text className="mt-2 text-4xl font-bold text-white">{formatMetric(query.data.totalPoints)}</Text>
              <Text className="mt-2 text-sm text-slate-400">
                {query.data.gameweek ? `Gameweek ${query.data.gameweek.gameweekNumber}` : 'Fantasy season'}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <MetricCard label="Budget" value={formatMetric(query.data.budget)} detail="Available funds" />
              <MetricCard label="Free transfers" value={formatMetric(query.data.freeTransfers)} />
            </View>
            <View className="flex-row gap-3">
              <MetricCard label="Global rank" value={formatMetric(query.data.globalRank)} />
              <MetricCard label="Squad" value={formatMetric(query.data.ownedPlayers.length)} detail="Players owned" />
            </View>
            {query.data.gameweek?.deadline ? (
              <View className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">Gameweek deadline</Text>
                <Text className="mt-2 text-base font-semibold text-white">
                  {new Date(query.data.gameweek.deadline).toLocaleString()}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <Text className="font-semibold text-white">No fantasy season yet</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-400">
              Your season details will appear here when they are available.
            </Text>
          </View>
        )}

        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Updating dashboard" color="#fb923c" /> : null}
      </ScrollView>
    </Screen>
  );
}
