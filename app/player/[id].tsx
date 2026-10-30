import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Modal, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { PriceSparkline } from '@/src/components/PriceSparkline';
import { Screen } from '@/src/components/Screen';
import { aggregateLatestGameweekScoreBreakdown, getPlayerDetail, PlayerPerformance } from '@/src/features/players/api';
import { getManagerProfile } from '@/src/features/account/api';
import { isPremiumUser } from '@/src/lib/premium';
import { getOwnershipPresentation } from '@/src/lib/ownership';
import { useMobileTheme } from '@/src/lib/theme';
import { useFantasyContext } from '@/src/features/fantasy/hooks';

function displayName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export default function PlayerDetailScreen() {
  const router = useRouter();
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const fantasyContext = useFantasyContext();
  const [selectedPerformance, setSelectedPerformance] = useState<PlayerPerformance | null>(null);
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
  const ownedPlayerIds = new Set((fantasyContext.data?.ownedPlayers ?? []).map((player) => player.id));
  const isOwned = query.data ? ownedPlayerIds.has(query.data.id) : false;

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
                {(() => {
                  const priceHistory = (query.data.performances ?? [])
                    .flatMap((perf) => (perf.price != null && Number.isFinite(perf.price) ? [perf.price] : []))
                    .reverse();
                  return (
                    <View className="min-w-20 flex-1 justify-between rounded-lg bg-slate-950 px-3 py-2">
                      <View>
                        <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Price</Text>
                        <Text className="mt-1 text-sm font-semibold text-slate-200">
                          {`${query.data.current_price?.toFixed(1) ?? '—'}M`}
                        </Text>
                      </View>
                      {priceHistory.length > 0 ? (
                        <View className="mt-1.5 self-start">
                          <PriceSparkline data={priceHistory} width={50} height={14} />
                        </View>
                      ) : null}
                    </View>
                  );
                })()}
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
              <View className="flex-row items-center gap-2">
                <View className={`self-start rounded-full px-3 py-1 ${query.data.availability_status === 'available' ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                  }`}>
                  <Text className={`text-xs font-semibold ${query.data.availability_status === 'available' ? 'text-emerald-300' : 'text-amber-200'
                    }`}>
                    {query.data.availability_status ?? 'Availability unknown'}
                  </Text>
                </View>
                {isOwned ? (
                  <View className="self-start rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1">
                    <Text className="text-xs font-semibold text-emerald-300">✓ In Your Squad</Text>
                  </View>
                ) : null}
              </View>
              {query.data.availability_reason ? (
                <Text className="text-sm leading-5 text-amber-200/80">{query.data.availability_reason}</Text>
              ) : null}
              <View className="flex-row gap-2">
                {isOwned ? (
                  <Pressable
                    accessibilityRole="button"
                    className="min-h-11 flex-1 items-center justify-center rounded-xl border border-emerald-500/50 bg-emerald-500/15"
                    onPress={() => router.push('/(tabs)/team')}
                  >
                    <Text className="font-semibold text-emerald-300">View In Squad</Text>
                  </Pressable>
                ) : query.data.availability_status === 'available' ? (
                  <Pressable
                    accessibilityRole="button"
                    className="min-h-11 flex-1 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/20"
                    onPress={() => router.push({
                      pathname: '/(tabs)/team',
                      params: {
                        quickAddPlayerId: String(query.data?.id),
                        quickAddPlayerName: displayName(query.data!),
                      },
                    })}
                  >
                    <Text className="font-bold text-emerald-300">Transfer In</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  className="min-h-11 flex-1 items-center justify-center rounded-xl border border-cyan-700/60 bg-cyan-950/40"
                  onPress={() => router.push(`/compare-players?ids=${query.data?.id}`)}
                >
                  <Text className="font-semibold text-cyan-200">Compare Player</Text>
                </Pressable>
              </View>
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
              <View
                className="gap-4 rounded-2xl border border-amber-500/30 p-5"
                style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-amber-400">Premium intelligence</Text>
                    <Text className="mt-0.5 text-xl font-extrabold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                      Form & Projections
                    </Text>
                  </View>
                  <View className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-1">
                    <Text className="text-xs font-bold text-amber-300">PRO</Text>
                  </View>
                </View>

                {/* Outcome Range & Volatility Index */}
                <View
                  className="rounded-xl border p-3.5"
                  style={{
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    backgroundColor: isDark ? '#020617' : '#ffffff',
                  }}
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <View>
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Outcome Range & Volatility
                      </Text>
                      <Text className="text-[10px] text-slate-500">10th vs 90th percentile realistic spread</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <View
                        className="rounded-full px-2 py-0.5 border"
                        style={{
                          borderColor:
                            query.data.analytics.volatility === 'Low'
                              ? 'rgba(16, 185, 129, 0.4)'
                              : query.data.analytics.volatility === 'High'
                                ? 'rgba(245, 158, 11, 0.4)'
                                : 'rgba(6, 182, 212, 0.4)',
                          backgroundColor:
                            query.data.analytics.volatility === 'Low'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : query.data.analytics.volatility === 'High'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(6, 182, 212, 0.15)',
                        }}
                      >
                        <Text
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            color:
                              query.data.analytics.volatility === 'Low'
                                ? '#34d399'
                                : query.data.analytics.volatility === 'High'
                                  ? '#fbbf24'
                                  : '#38bdf8',
                          }}
                        >
                          {query.data.analytics.volatility} Volatility
                        </Text>
                      </View>
                      {query.data.analytics.consistencyRate !== undefined ? (
                        <Text className="text-[10px] font-medium text-slate-400">
                          {query.data.analytics.consistencyRate}% Consistent
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Floor / Projected / Ceiling Visual Range Bar */}
                  <View className="mt-3">
                    <View
                      className="h-2.5 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}
                    >
                      <View
                        className="h-full rounded-full"
                        style={{
                          marginLeft: `${Math.min(80, Math.max(0, query.data.analytics.floor * 2.2))}%`,
                          width: `${Math.min(95, Math.max(10, (query.data.analytics.ceiling - query.data.analytics.floor) * 2.2))}%`,
                          backgroundColor: isDark ? '#2dd4bf' : '#0d9488',
                        }}
                      />
                    </View>
                    <View className="mt-2 flex-row items-center justify-between">
                      <View>
                        <Text className="text-[10px] uppercase font-semibold text-slate-500">Floor</Text>
                        <Text className="text-xs font-bold" style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
                          {query.data.analytics.floor.toFixed(1)} pts
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-[10px] uppercase font-bold text-cyan-400">Projected</Text>
                        <Text className="text-xs font-extrabold text-cyan-400">
                          {query.data.analytics.projectedPoints.toFixed(1)} pts
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[10px] uppercase font-semibold text-slate-500">Ceiling</Text>
                        <Text className="text-xs font-bold text-amber-400">
                          {query.data.analytics.ceiling.toFixed(1)} pts
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Stat Grid with Role Benchmark Delta */}
                <View className="flex-row flex-wrap gap-2 pt-1">
                  <Metric label="Projected" value={`${query.data.analytics.projectedPoints.toFixed(1)} pts`} />
                  <View className="min-w-20 flex-1 rounded-lg bg-slate-950 px-3 py-2 justify-between">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Avg Points</Text>
                    <Text className="mt-1 text-sm font-semibold text-slate-200">
                      {`${query.data.analytics.averagePoints.toFixed(1)} pts`}
                    </Text>
                    {query.data.analytics.roleDelta !== null && query.data.analytics.roleDelta !== undefined ? (
                      <Text
                        className="mt-0.5 text-[9px] font-semibold"
                        style={{
                          color: query.data.analytics.roleDelta >= 0 ? '#34d399' : '#f87171',
                        }}
                      >
                        {`${query.data.analytics.roleDelta >= 0 ? '+' : ''}${query.data.analytics.roleDelta.toFixed(1)} vs role`}
                      </Text>
                    ) : null}
                  </View>
                  <Metric
                    label="Price Delta"
                    value={`${query.data.analytics.priceChange >= 0 ? '+' : ''}${query.data.analytics.priceChange.toFixed(2)}M`}
                  />
                  <Metric label="Best Score" value={`${query.data.analytics.bestPoints.toFixed(1)} pts`} />
                </View>

                {/* Form Trend */}
                {query.data.analytics.form.length > 0 ? (
                  <View className="rounded-xl bg-slate-950 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Recent 5 Form Trend
                    </Text>
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
                <Text className="mt-1 text-sm text-slate-400">
                  Tap any match to view the complete fantasy scoring breakdown & performance metrics.
                </Text>
              </View>
              {query.data.performances.length ? query.data.performances.map((performance) => (
                <Pressable
                  key={performance.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View Gameweek ${performance.gameweek_id} match details`}
                  className="flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 active:bg-slate-800/80"
                  onPress={() => setSelectedPerformance(performance)}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-semibold text-white">Gameweek {performance.gameweek_id}</Text>
                      {performance.opponent_name ? (
                        <Text className="text-xs text-cyan-400 font-medium">vs {performance.opponent_name}</Text>
                      ) : null}
                      {performance.is_win !== null && performance.is_win !== undefined ? (
                        <View className={`rounded px-1.5 py-0.5 border ${performance.is_win ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30'
                          }`}>
                          <Text className={`text-[10px] font-bold ${performance.is_win ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                            {performance.is_win ? 'W' : 'L'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-1 text-xs text-slate-400">
                      {performance.kills ?? '—'} K · {performance.deaths ?? '—'} D · {performance.assists ?? '—'} A
                      {performance.duration_minutes ? ` · ${performance.duration_minutes}m` : ''}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-lg font-bold text-emerald-300">{performance.total_points.toFixed(1)} pts</Text>
                    <Text className="text-[11px] font-semibold text-brand-300">Details →</Text>
                  </View>
                </Pressable>
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

      {/* Match Details Modal */}
      {selectedPerformance && query.data ? (
        <Modal
          visible={Boolean(selectedPerformance)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPerformance(null)}
        >
          <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 16 }}>
            <View style={{ maxHeight: '90%', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1', borderWidth: 1, borderRadius: 24, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16 }}>

                {/* Header */}
                <View style={{ borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#e2e8f0', paddingBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: '#f59e0b', textTransform: 'uppercase' }}>
                        GW {selectedPerformance.gameweek_id}
                      </Text>
                    </View>
                    {selectedPerformance.is_win !== null && selectedPerformance.is_win !== undefined ? (
                      <View style={{ backgroundColor: selectedPerformance.is_win ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: selectedPerformance.is_win ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: selectedPerformance.is_win ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>
                          {selectedPerformance.is_win ? 'Victory' : 'Defeat'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ marginTop: 10, fontSize: 19, fontWeight: '700', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                    {displayName(query.data)}{selectedPerformance.opponent_name ? ` vs ${selectedPerformance.opponent_name}` : ''}
                  </Text>
                  {selectedPerformance.duration_minutes ? (
                    <Text style={{ marginTop: 4, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                      Match Duration: {selectedPerformance.duration_minutes} mins
                    </Text>
                  ) : null}
                </View>

                {/* Fantasy Points Summary */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 12, padding: 14 }}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#64748b' : '#94a3b8' }}>
                      Points Earned
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                      <Text style={{ fontSize: 26, fontWeight: '900', color: '#f59e0b' }}>
                        {selectedPerformance.total_points.toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fbbf24' }}>pts</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#64748b' : '#94a3b8' }}>
                      Combat K / D / A
                    </Text>
                    <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '700', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                      {selectedPerformance.kills ?? 0} / {selectedPerformance.deaths ?? 0} / {selectedPerformance.assists ?? 0}
                    </Text>
                  </View>
                </View>

                {/* In-Game Performance Stats Grid */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                    In-Game Performance
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <ModalMetric isDark={isDark} label="GPM / XPM" value={`${selectedPerformance.gold_per_minute ?? '—'} / ${selectedPerformance.experience_per_minute ?? '—'}`} />
                    <ModalMetric isDark={isDark} label="LH / Denies" value={`${selectedPerformance.last_hits ?? '—'} / ${selectedPerformance.denies ?? '—'}`} />
                    <ModalMetric isDark={isDark} label="Hero Dmg" value={selectedPerformance.hero_damage != null ? Number(selectedPerformance.hero_damage).toLocaleString() : '—'} />
                    <ModalMetric isDark={isDark} label="Tower / Rosh" value={`${selectedPerformance.tower_participation ?? '—'} / ${selectedPerformance.roshan_participation ?? '—'}`} />
                    <ModalMetric isDark={isDark} label="Building Dmg" value={selectedPerformance.building_damage != null ? Number(selectedPerformance.building_damage).toLocaleString() : '—'} />
                    <ModalMetric isDark={isDark} label="Healing" value={selectedPerformance.healing != null ? Number(selectedPerformance.healing).toLocaleString() : '—'} />
                    <ModalMetric isDark={isDark} label="Wards Placed/Cut" value={`${selectedPerformance.wards_placed ?? '—'} / ${selectedPerformance.wards_destroyed ?? '—'}`} />
                  </View>
                </View>

                {/* Fantasy Scoring Breakdown */}
                {selectedPerformance.score_breakdown ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Fantasy Scoring Breakdown
                    </Text>
                    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
                      {([
                        ['Combat Points (K/D/A)', selectedPerformance.score_breakdown.combat],
                        ['Economy (Normalized GPM/XPM)', selectedPerformance.score_breakdown.economy],
                        ['Objective (Towers & Roshan)', selectedPerformance.score_breakdown.objective],
                        ['Teamfight & Support', selectedPerformance.score_breakdown.teamfight],
                        ['Match Victory Bonus', selectedPerformance.score_breakdown.win],
                        ['Series Bonus', selectedPerformance.score_breakdown.series],
                        ['Performance Index', selectedPerformance.score_breakdown.performance],
                        ['Consistency Bonus', selectedPerformance.score_breakdown.consistency],
                        ['Penalty Points', selectedPerformance.score_breakdown.penalty],
                      ] as const).map(([label, value]) => (
                        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(51,65,85,0.6)' : '#f1f5f9', backgroundColor: isDark ? '#0f172a' : '#f8fafc', paddingHorizontal: 12, paddingVertical: 9 }}>
                          <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#475569' }}>{label}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: value >= 0 ? (isDark ? '#a3e635' : '#4d7c0f') : (isDark ? '#f87171' : '#b91c1c') }}>
                            {value >= 0 ? '+' : ''}{value.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                      {/* Total row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1e293b' : '#e2e8f0', paddingHorizontal: 12, paddingVertical: 11 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#f1f5f9' : '#0f172a' }}>Total Calculated Points</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#f59e0b' }}>
                          ={selectedPerformance.score_breakdown.total.toFixed(2)} pts
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Close Button */}
                <Pressable
                  accessibilityRole="button"
                  style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
                  onPress={() => setSelectedPerformance(null)}
                >
                  <Text style={{ fontWeight: '600', fontSize: 15, color: isDark ? '#f1f5f9' : '#0f172a' }}>Close</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
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

function ModalMetric({ isDark, label, value }: { isDark: boolean; label: string; value: string }) {
  return (
    <View style={{ minWidth: 80, flex: 1, borderRadius: 10, backgroundColor: isDark ? '#0f172a' : '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={{ fontSize: 10, fontWeight: '500', letterSpacing: 0.6, textTransform: 'uppercase', color: isDark ? '#64748b' : '#94a3b8' }}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: 13, fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>{value}</Text>
    </View>
  );
}
