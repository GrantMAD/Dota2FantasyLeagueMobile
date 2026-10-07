import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { getMatchesByFilters } from '@/src/features/competition/api';
import { getGameweeks } from '@/src/features/gameweeks/api';

function formatDate(value: string | null): string {
  if (!value) return 'Date not announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date not announced'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
}

export default function GameweekDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameweekId = Number(id);
  const validId = Number.isSafeInteger(gameweekId) && gameweekId > 0;
  const query = useQuery({
    queryKey: ['gameweek-detail', gameweekId],
    queryFn: async () => {
      const [gameweeks, matches] = await Promise.all([
        getGameweeks(),
        getMatchesByFilters({ gameweekId }),
      ]);
      return {
        gameweek: gameweeks.find((gameweek) => gameweek.id === gameweekId) ?? null,
        matches,
      };
    },
    enabled: validId,
    staleTime: 30_000,
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
          <Text className="font-semibold text-brand-300">‹ Back to Gameweeks</Text>
        </Pressable>
        {!validId ? (
          <Text accessibilityRole="alert" className="text-red-300">This gameweek link is invalid.</Text>
        ) : query.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading gameweek details" color="#fb923c" />
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Gameweek unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load this gameweek.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data?.gameweek ? (
          <>
            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {query.data.gameweek.status}
              </Text>
              <Text className="text-2xl font-bold text-white">
                Gameweek {query.data.gameweek.gameweek_number}
              </Text>
              <Text className="text-sm text-slate-300">
                Deadline · {formatDate(query.data.gameweek.deadline)} · {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </Text>
              <Text className="text-sm text-slate-400">
                {query.data.matches.length} matches · {query.data.gameweek.tournaments.map((item) => item.name).join(' · ') || 'No tournaments listed'}
              </Text>
              {query.data.gameweek.user_score !== null ? (
                <Text className="font-semibold text-emerald-300">
                  Your score · {query.data.gameweek.user_score.toFixed(1)} pts
                </Text>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => router.push('/squad-planner')}>
                <Text className="font-semibold text-cyan-300">Open squad planner</Text>
              </Pressable>
            </View>
            <View className="gap-3">
              <Text className="text-xl font-bold text-white">Schedule</Text>
              {query.data.matches.length ? query.data.matches.map((match) => (
                <Pressable
                  key={match.id}
                  accessibilityRole="button"
                  className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  onPress={() => router.push(`/match/${match.id}`)}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 font-semibold text-white">
                      {match.radiant_team?.name ?? 'Team TBA'}
                    </Text>
                    <Text className="text-xs text-slate-500">VS</Text>
                    <Text className="flex-1 text-right font-semibold text-white">
                      {match.dire_team?.name ?? 'Team TBA'}
                    </Text>
                  </View>
                  <Text className="text-sm text-cyan-200">{formatDate(match.scheduled_at)}</Text>
                  <Text className="text-xs uppercase text-slate-500">{match.status} · Best of {match.best_of}</Text>
                  {match.tournament ? <Text className="text-xs text-slate-400">{match.tournament.name}</Text> : null}
                </Pressable>
              )) : (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm text-slate-400">No matches are listed for this gameweek.</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <Text className="text-sm text-slate-300">This gameweek does not exist or is no longer available.</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
