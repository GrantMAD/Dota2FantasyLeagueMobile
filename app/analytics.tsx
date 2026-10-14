import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { getAnalytics } from '@/src/features/analytics/api';
import { getAnalyticsTrendForRange, getCaptainEfficiencyAssessment, type AnalyticsTrendRange } from '@/src/features/analytics/presentation';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-24 flex-1 justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
      <Text className="text-xs uppercase tracking-wider text-slate-400">{label}</Text>
      <Text className="text-xl font-bold text-white">{value}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [tab, setTab] = useState<'my' | 'market' | 'dream'>('my');
  const [trendRange, setTrendRange] = useState<AnalyticsTrendRange>('all');
  const query = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
    staleTime: 60_000,
  });
  const visibleTrend = getAnalyticsTrendForRange(query.data?.trend ?? [], trendRange);
  const maxTrend = Math.max(1, ...visibleTrend.map((item) => item.userScore));

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
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Your season</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Analytics</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Review your fantasy results, role contributions, captaincy, and player value.
          </Text>
        </View>
        <Link href="/premium" asChild>
          <Pressable accessibilityRole="button" className="min-h-10 self-start justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3">
            <Text className="text-sm font-semibold text-amber-300">Explore Premium Tools →</Text>
          </Pressable>
        </Link>

        {query.isPending ? (
          <View accessibilityLabel="Loading analytics" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
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

            <View
              accessibilityRole="tablist"
              accessibilityLabel="Analytics views"
              className="flex-row flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2"
            >
              {([
                ['my', 'My Performance'],
                ['market', 'Market'],
                ['dream', 'Dream Team'],
              ] as const).map(([key, label]) => (
                <Pressable
                  key={key}
                  nativeID={`analytics-tab-${key}`}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: tab === key }}
                  className={`min-h-10 flex-1 items-center justify-center rounded-xl px-3 ${
                    tab === key ? 'bg-brand-500' : ''
                  }`}
                  onPress={() => setTab(key)}
                >
                  <Text className={`text-xs font-semibold ${tab === key ? 'text-on-accent' : 'text-slate-300'}`}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {tab === 'my' ? (
              <View
                role="tabpanel"
                accessibilityLabel="My Performance"
                accessibilityLabelledBy="analytics-tab-my"
                className="gap-5"
              >
              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <View className="gap-3">
                <Text className="text-lg font-bold text-white">Gameweek trend</Text>
                <View accessibilityRole="tablist" accessibilityLabel="Gameweek trend range" className="flex-row gap-2">
                  {([
                    ['3', 'Last 3'],
                    ['6', 'Last 6'],
                    ['all', 'All'],
                  ] as const).map(([range, label]) => (
                    <Pressable
                      key={range}
                      accessibilityRole="button"
                      accessibilityLabel={`${label} gameweeks`}
                      accessibilityState={{ selected: trendRange === range }}
                      className={`min-h-10 flex-1 items-center justify-center rounded-lg border px-2 ${
                        trendRange === range ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-950'
                      }`}
                      onPress={() => setTrendRange(range)}
                    >
                      <Text className={`text-xs font-semibold ${trendRange === range ? 'text-brand-300' : 'text-slate-300'}`}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {visibleTrend.length ? (
                <>
                  <View
                    accessible
                    accessibilityRole="header"
                    accessibilityLabel="Columns: Gameweek, Your score, Global average"
                    className="flex-row border-b border-slate-700 pb-2"
                  >
                    <Text className="flex-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Gameweek</Text>
                    <Text className="w-20 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Your score</Text>
                    <Text className="w-24 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Global average</Text>
                  </View>
                  {visibleTrend.map((trend) => (
                    <View key={trend.gameweekId} className="gap-2 border-b border-slate-800 py-3">
                      <View
                        accessible
                        accessibilityLabel={`Gameweek ${trend.gameweekId}. Your score ${trend.userScore.toFixed(1)} points. Global average ${trend.globalAverage.toFixed(1)} points.`}
                        className="flex-row items-center"
                      >
                        <Text className="flex-1 text-sm text-slate-300">Gameweek {trend.gameweekId}</Text>
                        <Text className="w-20 text-right text-sm font-semibold tabular-nums text-white">
                          {trend.userScore.toFixed(1)}
                        </Text>
                        <Text className="w-24 text-right text-sm tabular-nums text-slate-400">
                          {trend.globalAverage.toFixed(1)}
                        </Text>
                      </View>
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        className="h-2 overflow-hidden rounded-full bg-slate-800"
                      >
                        <View
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width: `${Math.min(100, Math.max(2, (trend.userScore / maxTrend) * 100))}%` }}
                        />
                      </View>
                    </View>
                  ))}
                </>
              ) : <Text className="text-sm text-slate-400">No gameweek scores are available yet.</Text>}
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-lg font-bold text-white">Captain efficiency</Text>
              {(() => {
                const assessment = getCaptainEfficiencyAssessment(query.data.captainEfficiency.efficiency);
                const normalizedEfficiency = Math.min(100, Math.max(0, query.data.captainEfficiency.efficiency));
                return (
                  <>
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="text-sm text-slate-400">Efficiency</Text>
                      <View className="flex-row items-center gap-2">
                        <Text className={`text-lg font-bold ${assessment.color}`}>
                          {query.data.captainEfficiency.efficiency.toFixed(1)}%
                        </Text>
                        <Text className={`rounded-full border border-slate-700 px-2 py-1 text-xs font-semibold ${assessment.color}`}>
                          {assessment.label}
                        </Text>
                      </View>
                    </View>
                    <View
                      accessible
                      accessibilityRole="progressbar"
                      accessibilityLabel={`Captain efficiency: ${assessment.label}`}
                      accessibilityValue={{ min: 0, max: 100, now: normalizedEfficiency }}
                      className="h-2.5 overflow-hidden rounded-full bg-slate-800"
                    >
                      <View className={`h-full ${assessment.label === 'Good' ? 'bg-emerald-400' : assessment.label === 'Average' ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${normalizedEfficiency}%` }} />
                    </View>
                    <Text className={`text-xs ${assessment.color}`}>
                      {assessment.description} · Good ≥80%, Average ≥50%, Poor below 50%
                    </Text>
                  </>
                );
              })()}
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-400">Captain points / ideal</Text>
                <Text className="font-semibold text-white">
                  {query.data.captainEfficiency.captainPoints.toFixed(1)} / {query.data.captainEfficiency.idealCapPoints.toFixed(1)}
                </Text>
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

              </View>
            ) : null}

            {tab === 'dream' ? (
              <View
                role="tabpanel"
                accessibilityLabel="Dream Team"
                accessibilityLabelledBy="analytics-tab-dream"
                className="gap-5"
              >
              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-lg font-bold text-white">Dream team</Text>
              {query.data.dreamTeam.length ? query.data.dreamTeam.map((player, index) => (
                <View
                  key={`${player.playerName}-${index}`}
                  className={`gap-3 rounded-xl border p-4 ${
                    index < 5 ? 'border-brand-500/30 bg-brand-500/5' : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {index < 5 ? `Starter ${index + 1}` : `Bench ${index - 4}`}
                      </Text>
                      <Text className="mt-1 font-bold text-white">{player.playerName}</Text>
                      <Text className="mt-1 text-xs text-slate-400">{player.team}</Text>
                    </View>
                    <Text className="font-bold text-amber-300">{player.points.toFixed(1)} pts</Text>
                  </View>
                  <Text className="self-start rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300">{player.role}</Text>
                </View>
              )) : <Text className="text-sm text-slate-400">No scored professional players are available yet.</Text>}
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-lg font-bold text-white">Best value</Text>
              {query.data.valueForMoney.length ? query.data.valueForMoney.map((player, index) => (
                <View key={`${player.playerName}-${index}`} className="gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-bold text-white">{player.playerName}</Text>
                      <Text className="mt-1 text-xs text-slate-400">{player.team}</Text>
                    </View>
                    <Text className="font-bold text-emerald-300">{player.roi.toFixed(2)} ROI</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{player.role}</Text>
                    <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{player.price.toFixed(1)}M</Text>
                    <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{player.ownership.toFixed(1)}% owned</Text>
                  </View>
                </View>
              )) : <Text className="text-sm text-slate-400">Value rankings will appear when match data is available.</Text>}
            </View>
              </View>
            ) : null}

            {tab === 'market' ? (
              <View
                role="tabpanel"
                accessibilityLabel="Market"
                accessibilityLabelledBy="analytics-tab-market"
                className="gap-5"
              >
                <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-lg font-bold text-white">Market & metagame intelligence</Text>
                  <Text className="text-sm leading-5 text-slate-400">Ownership, value, and return-on-investment signals from the current player market.</Text>
                  {query.data.market.length ? query.data.market.map((player, index) => (
                    <View key={`${player.playerName}-${index}`} className="gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="font-bold text-white">{player.playerName}</Text>
                          <Text className="mt-1 text-xs text-slate-400">{player.team}</Text>
                        </View>
                        <Text className="font-bold text-brand-300">{player.roi.toFixed(2)} ROI</Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{player.role}</Text>
                        <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{player.price.toFixed(1)}M</Text>
                        <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{player.ownership.toFixed(1)}% owned</Text>
                      </View>
                    </View>
                  )) : <Text className="text-sm text-slate-400">Market insights will appear when player data is available.</Text>}
                </View>
                <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-lg font-bold text-white">Best value</Text>
                  {query.data.valueForMoney.length ? query.data.valueForMoney.map((player, index) => (
                    <View key={`${player.playerName}-${index}`} className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-semibold text-white">{player.playerName}</Text>
                        <Text className="text-xs text-slate-500">{player.team} · {player.role} · {player.price.toFixed(1)}M</Text>
                      </View>
                      <Text className="font-bold text-emerald-300">{player.roi.toFixed(2)} ROI</Text>
                    </View>
                  )) : <Text className="text-sm text-slate-400">Value rankings will appear when match data is available.</Text>}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
