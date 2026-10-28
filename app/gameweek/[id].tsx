import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { getMatchesByFilters } from '@/src/features/competition/api';
import { TeamMatchup } from '@/src/features/competition/TeamMatchup';
import { getGameweeks } from '@/src/features/gameweeks/api';

function formatDate(value: string | null): string {
  if (!value) return 'Date not announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date not announced'
    : date.toLocaleString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
}

function formatDeadline(value: string | null): string {
  if (!value) return 'Not announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not announced'
    : date.toLocaleString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
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
  function goBackToGameweeks() {
    if (router.canGoBack()) router.back();
    else router.replace('/gameweeks');
  }
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
  const teamFlags = query.data?.gameweek?.flags ?? [];

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#14b8a6" />
        }
      >
        <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start" onPress={goBackToGameweeks}>
          <Text className="font-semibold text-brand-300">‹ Back to Gameweeks</Text>
        </Pressable>
        {!validId ? (
          <Text accessibilityRole="alert" className="text-red-300">This gameweek link is invalid.</Text>
        ) : query.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading gameweek details" color="#14b8a6" />
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Gameweek unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load this gameweek.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/gameweeks')}>
              <Text className="font-semibold text-cyan-200">Browse all gameweeks</Text>
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
                {formatDate(query.data.gameweek.start_date)} – {formatDate(query.data.gameweek.end_date)}
              </Text>
              <Text className="text-sm text-slate-300">
                Deadline · {formatDeadline(query.data.gameweek.deadline)}
              </Text>
              <Text className="text-sm text-slate-400">
                {query.data.matches.length} matches · {query.data.gameweek.tournaments.map((item) => item.name).join(' · ') || 'No tournaments listed'}
              </Text>
              {query.data.gameweek.user_score !== null ? (
                <Text className="font-semibold text-emerald-300">
                  Your score · {query.data.gameweek.user_score.toFixed(1)} pts
                </Text>
              ) : null}
              {query.data.gameweek.global_average !== null ? (
                <Text className="text-sm text-slate-300">
                  Global average · {query.data.gameweek.global_average.toFixed(1)} pts
                </Text>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => router.push('/squad-planner')}>
                <Text className="font-semibold text-cyan-300">Open squad planner</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/team?tab=lineup')}>
                <Text className="font-semibold text-cyan-300">Open your lineup</Text>
              </Pressable>
            </View>
            {teamFlags.length > 0 ? (
              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <Text className="text-lg font-bold text-white">Team schedule notices</Text>
                {(['double', 'blank'] as const).map((flag) => {
                  const teams = teamFlags.filter((item) => item.flag === flag);
                  if (teams.length === 0) return null;
                  const tone = flag === 'double' ? 'text-amber-300' : 'text-orange-300';
                  return (
                    <View key={flag} className="gap-1">
                      <Text className={`font-semibold capitalize ${tone}`}>
                        {flag} gameweek · {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                      </Text>
                      <Text className="text-sm leading-5 text-slate-300">
                        {teams.map((team) => team.team_name).join(' · ')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
            {query.data.gameweek.top_scorer ? (
              <View className="flex-row items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <View className="h-14 w-14 overflow-hidden rounded-xl bg-slate-800">
                  {query.data.gameweek.top_scorer.profile_image_url ? (
                    <Image
                      source={{ uri: query.data.gameweek.top_scorer.profile_image_url }}
                      className="h-full w-full"
                      accessibilityLabel={`${query.data.gameweek.top_scorer.name} avatar`}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Text className="font-bold text-slate-300">
                        {query.data.gameweek.top_scorer.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-amber-300">Gameweek top scorer</Text>
                  <Text className="mt-1 font-semibold text-white">{query.data.gameweek.top_scorer.in_game_name || query.data.gameweek.top_scorer.name}</Text>
                  <Text className="mt-1 text-xs text-slate-400">
                    {query.data.gameweek.top_scorer.primary_role ?? 'Role unassigned'} · {query.data.gameweek.top_scorer.matches_played} matches
                  </Text>
                </View>
                <Text className="text-right font-bold text-emerald-300">
                  {query.data.gameweek.top_scorer.total_points.toFixed(1)} pts
                </Text>
              </View>
            ) : null}
            <View className="gap-3">
              <Text className="text-xl font-bold text-white">Schedule</Text>
              {query.data.matches.length ? query.data.matches.map((match) => (
                <Pressable
                  key={match.id}
                  accessibilityRole="button"
                  className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  onPress={() => router.push(`/match/${match.id}`)}
                >
                  <TeamMatchup radiantTeam={match.radiant_team} direTeam={match.dire_team} />
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
          <View className="gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <Text className="text-sm text-slate-300">This gameweek does not exist or is no longer available.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/gameweeks')}>
              <Text className="font-semibold text-cyan-300">Browse all gameweeks</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
