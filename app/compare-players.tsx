import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { Screen } from '@/src/components/Screen';
import { getPlayerDetail, normalizePlayerComparisonIds } from '@/src/features/players/api';
import { getManagerProfile } from '@/src/features/account/api';
import { isPremiumUser } from '@/src/lib/premium';
import { getOwnershipPresentation } from '@/src/lib/ownership';

function displayName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export default function ComparePlayersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ids?: string }>();
  const ids = normalizePlayerComparisonIds(params.ids ?? '');
  const query = useQuery({
    queryKey: ['player-comparison', ids],
    queryFn: () => Promise.all(ids.map(getPlayerDetail)),
    enabled: ids.length >= 2,
    staleTime: 60_000,
  });

  const profileQuery = useQuery({
    queryKey: ['manager-profile'],
    queryFn: getManagerProfile,
    staleTime: 60_000,
  });
  const hasPremium = isPremiumUser(profileQuery.data);

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
          <Text className="font-semibold text-brand-300">‹  Back</Text>
        </Pressable>
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-cyan-300">Player analysis</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Compare players</Text>
        </View>
        {ids.length < 2 ? (
          <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <Text className="font-semibold text-white">Choose at least two players</Text>
            <Text className="text-sm leading-5 text-slate-400">Select two to four players from Discover to compare them side by side.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/discover')}>
              <Text className="font-semibold text-brand-300">Go to Discover</Text>
            </Pressable>
          </View>
        ) : query.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading player comparison" color="#14b8a6" />
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
                  <View className="flex-row items-center gap-3">
                    <PlayerAvatar uri={player.profile_image_url} label={displayName(player)} size={44} />
                    <View className="flex-1">
                      <Text className="font-bold text-white">{displayName(player)}</Text>
                      <Text className="mt-1 text-xs text-slate-400">{player.team_name ?? 'Free agent'}</Text>
                      <Text className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-300">
                        {player.primary_role ?? 'Role unavailable'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <View className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: 112 + query.data.length * 120 }}>
                <View>
                  <ComparisonRow label="Availability" values={query.data.map((player) => player.availability_status ?? 'Unknown')} />
                  <ComparisonRow label="Price" values={query.data.map((player) => `${player.current_price?.toFixed(1) ?? '—'}M`)} />
                  <ComparisonRow label="Season points" values={query.data.map((player) => `${player.total_season_points.toFixed(1)}`)} />
                  <ComparisonRow label="Latest gameweek" values={query.data.map((player) => `${player.last_gw_points.toFixed(1)}`)} />
                  <ComparisonRow label="Recent average" values={query.data.map((player) => `${player.recent_points.toFixed(1)}`)} />
                  {/* Ownership comparison row with tier badge pills */}
                  <View className="flex-row border-b border-slate-800 px-3 py-3 items-center">
                    <Text className="w-28 text-xs font-medium text-slate-400">Ownership</Text>
                    {query.data.map((player) => {
                      const ownPres = getOwnershipPresentation(player.ownership_percentage);
                      return (
                        <View key={`own-${player.id}`} className="w-[120px] items-center gap-1">
                          <Text className="text-center text-xs font-semibold text-slate-200">
                            {`${player.ownership_percentage.toFixed(1)}%`}
                          </Text>
                          <View className={`rounded-full px-2 py-0.5 ${ownPres.badgeBg}`}>
                            <Text className={`text-[10px] font-semibold ${ownPres.badgeText}`}>
                              {ownPres.label}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  {hasPremium ? (
                    <>
                      <ComparisonRow
                        label="Projected pts"
                        values={query.data.map((player) => `${player.analytics?.projectedPoints?.toFixed(1) ?? '—'}`)}
                        highlight
                      />
                      <ComparisonRow
                        label="Floor / Ceiling"
                        values={query.data.map((player) => player.analytics ? `${player.analytics.floor.toFixed(1)} - ${player.analytics.ceiling.toFixed(1)} (${player.analytics.volatility[0]})` : '—')}
                        highlight
                      />
                      <ComparisonRow
                        label="Role Delta"
                        values={query.data.map((player) => {
                          if (!player.analytics || player.analytics.roleDelta === null) return '—';
                          const delta = player.analytics.roleDelta;
                          return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts`;
                        })}
                        highlight
                      />
                      <ComparisonRow
                        label="5-GW Form"
                        values={query.data.map((player) => player.analytics?.form?.length ? player.analytics.form.map(f => f.toFixed(0)).join(', ') : '—')}
                        highlight
                      />
                      <ComparisonRow
                        label="Price movement"
                        values={query.data.map((player) => player.analytics ? `${player.analytics.priceChange >= 0 ? '+' : ''}${player.analytics.priceChange.toFixed(2)}M` : '—')}
                        highlight
                      />
                    </>
                  ) : null}
                </View>
              </ScrollView>
            </View>
            {hasPremium ? (
              <View className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <Text className="text-xs font-semibold text-amber-300">
                  ★ Advanced Intelligence Active: Side-by-side floor/ceiling spreads, role benchmark deltas, projected points, and price deltas unlocked.
                </Text>
              </View>
            ) : (
              <View className="gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-slate-300">Advanced Comparison Intelligence</Text>
                  <Text className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Premium</Text>
                </View>
                <Text className="text-xs leading-4 text-slate-400">
                  Upgrade to unlock projected points, 5-game form sparklines, and price movement deltas.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  className="self-start rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5"
                  onPress={() => router.push('/premium')}
                >
                  <Text className="text-xs font-bold text-amber-300">Explore Premium Features →</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ComparisonRow({ label, values, highlight }: { label: string; values: string[]; highlight?: boolean }) {
  return (
    <View className={`flex-row border-b border-slate-800 px-3 py-3 ${highlight ? 'bg-amber-500/5' : ''}`}>
      <Text className={`w-28 text-xs font-medium ${highlight ? 'text-amber-300' : 'text-slate-400'}`}>{label}</Text>
      {values.map((value, index) => (
        <Text key={`${label}-${index}`} className={`w-[120px] text-center text-xs font-semibold ${highlight ? 'text-amber-200' : 'text-slate-200'}`}>
          {value}
        </Text>
      ))}
    </View>
  );
}
