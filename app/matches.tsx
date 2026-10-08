import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { getMatches } from '@/src/features/competition/api';

const filters = ['all', 'live', 'upcoming', 'completed'] as const;
type MatchFilter = (typeof filters)[number];

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time to be confirmed'
    : date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

export default function MatchesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<MatchFilter>('all');
  const query = useQuery({
    queryKey: ['matches', filter],
    queryFn: () => getMatches(filter),
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
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Pro circuit</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Match Center</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">Live, upcoming, and completed professional matches.</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {filters.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              className={`min-h-10 justify-center rounded-full border px-4 ${
                filter === value ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
              }`}
              onPress={() => setFilter(value)}
            >
              <Text className={`text-sm font-semibold capitalize ${filter === value ? 'text-brand-300' : 'text-slate-300'}`}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        {query.isPending ? (
          <View accessibilityLabel="Loading matches" className="gap-3">
            {[1, 2, 3].map((item) => <View key={item} className="h-32 rounded-2xl bg-slate-800" />)}
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Matches unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load matches.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data.length ? (
          <View className="gap-3">
            {query.data.map((match) => (
              <Pressable
                key={match.id}
                accessibilityRole="button"
                accessibilityLabel={`View ${match.radiant_team?.name ?? 'team'} versus ${match.dire_team?.name ?? 'team'} match details`}
                className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                onPress={() => router.push(`/match/${match.id}`)}
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className={`text-xs font-semibold uppercase tracking-wider ${
                    match.status === 'live' ? 'text-red-300' : 'text-slate-400'
                  }`}>
                    {match.status === 'live' ? '● Live' : match.status}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    {match.gameweek_id ? `GW ${match.gameweek_id}` : `Match ${match.match_number}`}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between gap-3">
                  <Text numberOfLines={2} className="flex-1 font-semibold text-white">
                    {match.radiant_team?.name ?? 'Team TBA'}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500">VS</Text>
                  <Text numberOfLines={2} className="flex-1 text-right font-semibold text-white">
                    {match.dire_team?.name ?? 'Team TBA'}
                  </Text>
                </View>
                <Text className="text-sm text-cyan-200">{formatDate(match.scheduled_at)}</Text>
                <View className="flex-row items-center justify-between gap-3 border-t border-slate-800 pt-3">
                  <Text numberOfLines={1} className="flex-1 text-xs text-slate-400">
                    {match.tournament?.name ?? 'Tournament not announced'}
                  </Text>
                  <Text className="text-xs text-slate-500">Best of {match.best_of}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-sm text-slate-300">No {filter === 'all' ? '' : `${filter} `}matches found.</Text>
          </View>
        )}
        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Refreshing matches" color="#14b8a6" /> : null}
      </ScrollView>
    </Screen>
  );
}
