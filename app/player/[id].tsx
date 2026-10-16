import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { Screen } from '@/src/components/Screen';
import { aggregateLatestGameweekScoreBreakdown, getPlayerDetail } from '@/src/features/players/api';
import { getManagerProfile } from '@/src/features/account/api';
import { isPremiumUser } from '@/src/lib/premium';
import { getOwnershipPresentation } from '@/src/lib/ownership';

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

  const profileQuery = useQuery({
    queryKey: ['manager-profile'],
    queryFn: getManagerProfile,
    staleTime: 60_000,
  });
  const hasPremium = isPremiumUser(profileQuery.data);
  const latestScore = query.data
    ? aggregateLatestGameweekScoreBreakdown(query.data.performances)
    : null;
  const hasScoreBreakdownData = query.data?.performances.some(
    (performance) => performance.score_breakdown !== undefined,
  ) ?? false;

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
              </View>

              {/* Enhanced Ownership Card */}
              {(() => {
                const ownPres = getOwnershipPresentation(query.data.ownership_percentage);
                const ownPct = query.data.ownership_percentage;
                return (
                  <View className="gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Player Ownership
                      </Text>
                      <View className={`rounded-full px-2.5 py-0.5 ${ownPres.badgeBg}`}>
                        <Text className={`text-xs font-semibold ${ownPres.badgeText}`}>
                          {ownPres.label}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-baseline justify-between">
                      <Text className="text-2xl font-bold text-white">
                        {ownPct.toFixed(1)}%
                      </Text>
                      <Text className="text-xs text-slate-400">
                        of fantasy managers
                      </Text>
                    </View>
                    <View className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <View
                        style={{
                          width: `${Math.min(100, Math.max(2, ownPct))}%`,
                          backgroundColor: ownPres.color,
                        }}
                        className="h-full rounded-full"
                      />
                    </View>
                  </View>
                );
              })()}
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

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <View className="flex-row items-center justify-between gap-3">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Score breakdown
                  </Text>
                  <Text className="mt-1 text-sm text-slate-300">
                    {latestScore ? `Gameweek ${latestScore.gameweekId}` : 'Most recent gameweek'}
                  </Text>
                </View>
                {latestScore ? (
                  <Text className="text-lg font-bold text-brand-300">
                    {latestScore.breakdown.total.toFixed(2)} pts
                  </Text>
                ) : null}
              </View>
              {latestScore ? (
                <View className="flex-row flex-wrap gap-2">
                  {([
                    ['Combat', latestScore.breakdown.combat],
                    ['Economy', latestScore.breakdown.economy],
                    ['Objective', latestScore.breakdown.objective],
                    ['Teamfight', latestScore.breakdown.teamfight],
                    ['Win', latestScore.breakdown.win],
                    ['Series', latestScore.breakdown.series],
                    ['Performance', latestScore.breakdown.performance],
                    ['Consistency', latestScore.breakdown.consistency],
                    ['Penalty', latestScore.breakdown.penalty],
                  ] as const).map(([label, value]) => (
                    <Metric
                      key={label}
                      label={label}
                      value={`${value >= 0 ? '+' : ''}${value.toFixed(2)}`}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-slate-400">
                  {hasScoreBreakdownData
                    ? 'No score breakdown has been recorded for this player yet.'
                    : 'Detailed score categories will appear after the mobile score-breakdown database migration is applied.'}
                </Text>
              )}
            </View>

            {hasPremium && query.data.analytics ? (
              <View className="gap-3 rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-semibold uppercase tracking-wider text-amber-300">Premium intelligence</Text>
                    <Text className="mt-1 text-xl font-bold text-white">Form & Projections</Text>
                  </View>
                  <View className="rounded-full bg-amber-500/20 px-2.5 py-1">
                    <Text className="text-xs font-bold text-amber-300">PRO</Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2 pt-1">
                  <Metric label="Projected" value={`${query.data.analytics.projectedPoints.toFixed(1)} pts`} />
                  <Metric label="Avg Points" value={`${query.data.analytics.averagePoints.toFixed(1)} pts`} />
                  <Metric label="Price Delta" value={`${query.data.analytics.priceChange >= 0 ? '+' : ''}${query.data.analytics.priceChange.toFixed(2)}M`} />
                  <Metric label="Best Score" value={`${query.data.analytics.bestPoints.toFixed(1)} pts`} />
                </View>
                {query.data.analytics.form.length > 0 ? (
                  <View className="mt-2 rounded-xl bg-slate-950 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Recent 5 Form Trend</Text>
                    <View className="mt-2 flex-row items-center gap-2">
                      {query.data.analytics.form.map((pts, idx) => (
                        <View key={idx} className="flex-1 items-center rounded-lg bg-slate-800/80 py-1.5">
                          <Text className="text-xs font-bold text-cyan-300">{pts.toFixed(1)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : !hasPremium ? (
              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Advanced Analytics</Text>
                  <Text className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Premium</Text>
                </View>
                <Text className="text-xs text-slate-400">Unlock projected points, price movement deltas, and 5-game form trends.</Text>
                <Pressable
                  accessibilityRole="button"
                  className="self-start rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5"
                  onPress={() => router.push('/premium')}
                >
                  <Text className="text-xs font-bold text-amber-300">Explore Premium Features →</Text>
                </Pressable>
              </View>
            ) : null}

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
