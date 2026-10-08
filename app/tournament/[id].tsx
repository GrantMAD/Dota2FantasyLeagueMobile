import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { getTournamentDetails } from '@/src/features/competition/api';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time to be confirmed'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
}

export default function TournamentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);
  const validId = Number.isSafeInteger(tournamentId) && tournamentId > 0;
  const query = useQuery({
    queryKey: ['tournament-detail', tournamentId],
    queryFn: () => getTournamentDetails(tournamentId),
    enabled: validId,
    staleTime: 60_000,
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
          <Text className="font-semibold text-brand-300">‹ Back to Tournaments</Text>
        </Pressable>
        {!validId ? (
          <Text accessibilityRole="alert" className="text-red-300">This tournament link is invalid.</Text>
        ) : query.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading tournament details" color="#14b8a6" />
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Tournament unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load this tournament.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data ? (
          <>
            <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Tournament</Text>
              <Text className="text-2xl font-bold text-white">{query.data.tournament.name}</Text>
              <Text className="text-sm text-slate-400">{query.data.tournament.tier ?? 'Tier not specified'}</Text>
              <Text className="text-sm text-slate-400">{query.data.matches.length} scheduled matches</Text>
            </View>
            <View className="gap-3">
              <Text className="text-xl font-bold text-white">Matches</Text>
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
                </Pressable>
              )) : (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm text-slate-400">No matches are scheduled for this tournament yet.</Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
