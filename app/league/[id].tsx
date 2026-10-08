import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { getLeague } from '@/src/features/leagues/api';
import { useAuth } from '@/src/lib/auth';

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const leagueId = Number(id);
  const validId = Number.isInteger(leagueId) && leagueId > 0;
  const query = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!validId) return null;
      return getLeague(leagueId);
    },
    enabled: validId,
    staleTime: 60_000,
  });
  const league = query.data;
  const standings = [...(league?.standings ?? [])].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return b.points - a.points;
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
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text className="font-semibold text-cyan-300">‹ Back to leagues</Text>
        </Pressable>
        {!validId ? (
          <View className="gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-lg font-semibold text-white">League not found</Text>
            <Text className="text-sm text-slate-400">The league link is not valid.</Text>
          </View>
        ) : query.isPending ? (
          <View accessibilityLabel="Loading league" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">League unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load this league.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : !league ? (
          <View className="gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-lg font-semibold text-white">League not found</Text>
            <Text className="text-sm text-slate-400">It may be private or no longer available to your account.</Text>
          </View>
        ) : (
          <>
            <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">
                {league.type === 'h2h' ? 'Head-to-head league' : 'Classic league'}
              </Text>
              <Text className="text-2xl font-bold text-white">{league.name}</Text>
              {league.description ? <Text className="text-sm leading-5 text-slate-400">{league.description}</Text> : null}
              <Text className="text-sm text-slate-300">
                {league.currentParticipants} of {league.maxParticipants} managers · {league.privacyLevel}
              </Text>
              {league.privacyLevel === 'private' && league.inviteCode ? (
                <View className="mt-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
                  <Text className="text-xs uppercase tracking-wider text-slate-500">Invite code</Text>
                  <Text selectable className="mt-1 font-mono text-lg font-bold text-amber-300">{league.inviteCode}</Text>
                  <Text className="mt-1 text-xs text-slate-500">Tap and hold the code to copy it.</Text>
                </View>
              ) : null}
            </View>

            <View className="gap-3">
              <View className="flex-row items-end justify-between">
                <Text className="text-xl font-bold text-white">Standings</Text>
                <Text className="text-xs text-slate-500">Points · GW points</Text>
              </View>
              {standings.length ? standings.map((standing, index) => {
                const isCurrentUser = standing.userId === session?.user.id;
                return (
                  <View
                    key={standing.userId}
                    className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                      isCurrentUser ? 'border-brand-500/60 bg-brand-500/10' : 'border-slate-800 bg-slate-900'
                    }`}
                  >
                    <Text className="w-8 text-center text-sm font-bold text-slate-400">{standing.rank ?? index + 1}</Text>
                    <View className="flex-1">
                      <Text className={`font-semibold ${isCurrentUser ? 'text-brand-200' : 'text-white'}`}>
                        {standing.manager}{isCurrentUser ? ' · You' : ''}
                      </Text>
                      {league.type === 'h2h' ? (
                        <Text className="mt-1 text-xs text-slate-500">
                          {standing.wins} wins · {standing.draws} draws · {standing.losses} losses
                        </Text>
                      ) : null}
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-white">{standing.points}</Text>
                      <Text className="text-xs text-slate-500">{standing.gameweekPoints} GW</Text>
                    </View>
                  </View>
                );
              }) : (
                <Text className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                  No standings are available yet.
                </Text>
              )}
            </View>

            {league.type === 'h2h' ? (
              <View className="gap-3">
                <Text className="text-xl font-bold text-white">Fixtures</Text>
                {league.fixtures.length ? league.fixtures.map((fixture) => (
                  <View key={fixture.id} className="gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Gameweek {fixture.gameweekId}{fixture.isBye ? ' · Bye' : ''}
                    </Text>
                    <View className="flex-row items-center justify-between gap-3">
                      <Text numberOfLines={1} className="flex-1 font-medium text-white">{fixture.home}</Text>
                      <Text className="font-bold text-cyan-200">{fixture.homePoints} – {fixture.awayPoints}</Text>
                      <Text numberOfLines={1} className="flex-1 text-right font-medium text-white">{fixture.away}</Text>
                    </View>
                  </View>
                )) : (
                  <Text className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                    No head-to-head fixtures are available yet.
                  </Text>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
