import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { getAnalytics } from '@/src/features/analytics/api';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-24 flex-1 justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
      <Text className="text-xs uppercase tracking-wider text-slate-400">{label}</Text>
      <Text className="text-xl font-bold text-white">{value}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const query = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
    staleTime: 60_000,
  });
  const maxTrend = Math.max(1, ...(query.data?.trend ?? []).map((item) => item.userScore));

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
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Your season</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Analytics</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Review your fantasy results, role contributions, captaincy, and player value.
          </Text>
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading analytics" className="items-center py-12">
            <ActivityIndicator color="#fb923c" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Analytics unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load your analytics.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="flex-row gap-3">
              <Metric label="Season points" value={query.data.user.totalPoints.toFixed(1)} />
              <Metric label="Global rank" value={query.data.user.globalRank ? `#${query.data.user.globalRank}` : '—'} />
            </View>
            <View className="flex-row gap-3">
              <Metric label="Squad value" value={query.data.user.squadValue.toFixed(1)} />
              <Metric label="Budget" value={query.data.user.budget.toFixed(1)} />
              <Metric label="Free transfers" value={String(query.data.user.freeTransfers)} />
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-lg font-bold text-white">Gameweek trend</Text>
              {query.data.trend.length ? query.data.trend.map((trend) => (
                <View key={trend.gameweekId} className="gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-slate-300">Gameweek {trend.gameweekId}</Text>
                    <Text className="text-xs text-slate-500">
                      {trend.userScore.toFixed(1)} pts · {trend.globalAverage.toFixed(1)} average
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <View
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${Math.min(100, Math.max(2, (trend.userScore / maxTrend) * 100))}%` }}
                    />
                  </View>
                </View>
              )) : <Text className="text-sm text-slate-400">No gameweek scores are available yet.</Text>}
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-lg font-bold text-white">Captain efficiency</Text>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-400">Captain points / ideal</Text>
                <Text className="font-semibold text-white">
                  {query.data.captainEfficiency.captainPoints.toFixed(1)} / {query.data.captainEfficiency.idealCapPoints.toFixed(1)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-400">Efficiency</Text>
                <Text className="font-bold text-cyan-300">{query.data.captainEfficiency.efficiency.toFixed(1)}%</Text>
              </View>
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-lg font-bold text-white">Points by lineup role</Text>
              {query.data.roleBreakdown.length ? query.data.roleBreakdown.map((item) => (
                <View key={item.role} className="flex-row justify-between border-b border-slate-800 pb-2">
                  <Text className="text-sm text-slate-300">{item.role}</Text>
                  <Text className="font-semibold text-white">{item.points.toFixed(1)}</Text>
                </View>
              )) : <Text className="text-sm text-slate-400">Role scoring will appear as lineups are completed.</Text>}
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-lg font-bold text-white">Dream team</Text>
              {query.data.dreamTeam.length ? query.data.dreamTeam.map((player, index) => (
                <View key={`${player.playerName}-${index}`} className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-white">{player.playerName}</Text>
                    <Text className="text-xs text-slate-500">{player.team} · {player.role}</Text>
                  </View>
                  <Text className="font-bold text-amber-300">{player.points.toFixed(1)}</Text>
                </View>
              )) : <Text className="text-sm text-slate-400">No scored professional players are available yet.</Text>}
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-lg font-bold text-white">Best value</Text>
              {query.data.valueForMoney.length ? query.data.valueForMoney.map((player, index) => (
                <View key={`${player.playerName}-${index}`} className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-white">{player.playerName}</Text>
                    <Text className="text-xs text-slate-500">{player.team} · {player.role} · {player.price.toFixed(1)}</Text>
                  </View>
                  <Text className="font-bold text-emerald-300">{player.roi.toFixed(2)} ROI</Text>
                </View>
              )) : <Text className="text-sm text-slate-400">Value rankings will appear when match data is available.</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
