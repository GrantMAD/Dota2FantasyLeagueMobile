import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { getMatchDetails } from '@/src/features/competition/api';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time to be confirmed'
    : date.toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
}

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const validId = Number.isSafeInteger(matchId) && matchId > 0;
  const query = useQuery({
    queryKey: ['match-detail', matchId],
    queryFn: () => getMatchDetails(matchId),
    enabled: validId,
    staleTime: 30_000,
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
          <Text className="font-semibold text-brand-300">‹ Back to Match Center</Text>
        </Pressable>
        {!validId ? (
          <Text accessibilityRole="alert" className="text-red-300">This match link is invalid.</Text>
        ) : query.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading match details" color="#14b8a6" />
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Match unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load this match.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data ? (
          <>
            <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {query.data.match.status} · Match {query.data.match.match_number}
              </Text>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-lg font-bold text-white">
                  {query.data.match.radiant_team?.name ?? 'Team TBA'}
                </Text>
                <Text className="text-xs text-slate-500">VS</Text>
                <Text className="flex-1 text-right text-lg font-bold text-white">
                  {query.data.match.dire_team?.name ?? 'Team TBA'}
                </Text>
              </View>
              <Text className="text-sm text-slate-300">{formatDate(query.data.match.scheduled_at)}</Text>
              <Text className="text-sm text-slate-400">
                Best of {query.data.match.best_of}
                {query.data.match.tournament ? ` · ${query.data.match.tournament.name}` : ''}
              </Text>
              {query.data.match.gameweek_id ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/gameweek/${query.data.match.gameweek_id}`)}
                >
                  <Text className="font-semibold text-cyan-300">View gameweek details</Text>
                </Pressable>
              ) : null}
              {query.data.match.tournament ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/tournament/${query.data.match.tournament?.id}`)}
                >
                  <Text className="font-semibold text-cyan-300">View tournament</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-xl font-bold text-white">Player performance</Text>
                <Text className="mt-1 text-sm text-slate-400">Match statistics from the shared match API.</Text>
              </View>
              {query.data.playerStats.length ? query.data.playerStats.map((player) => (
                <Pressable
                  key={player.id}
                  accessibilityRole="button"
                  className="gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
                  onPress={() => router.push(`/player/${player.player_id}`)}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 font-semibold text-white">
                      {player.player?.name ?? `Player ${player.player_id}`}
                    </Text>
                    {player.hero_name ? (
                      <Text className="text-right text-xs text-slate-400">{player.hero_name}</Text>
                    ) : null}
                  </View>
                  <Text className="text-sm text-slate-300">
                    K / D / A · {player.kills} / {player.deaths} / {player.assists}
                    {player.gold_per_minute !== null ? ` · ${player.gold_per_minute} GPM` : ''}
                  </Text>
                </Pressable>
              )) : (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm text-slate-400">Player statistics have not been published for this match.</Text>
                </View>
              )}
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-xl font-bold text-white">Fantasy points</Text>
                <Text className="mt-1 text-sm text-slate-400">Scoring data from the shared match API.</Text>
              </View>
              {query.data.fantasyBreakdown.length ? query.data.fantasyBreakdown.map((player) => (
                <Pressable
                  key={player.player_id}
                  accessibilityRole="button"
                  className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4"
                  onPress={() => router.push(`/player/${player.player_id}`)}
                >
                  <Text className="font-semibold text-white">
                    {query.data.playerStats.find((stat) => stat.player_id === player.player_id)?.player?.name
                      ?? `Player ${player.player_id}`}
                  </Text>
                  <Text className="font-bold text-emerald-300">
                    {player.total_points === null ? '—' : `${player.total_points.toFixed(1)} pts`}
                  </Text>
                </Pressable>
              )) : (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm text-slate-400">Fantasy scoring has not been published for this match.</Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
