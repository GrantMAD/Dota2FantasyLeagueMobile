import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { getTournaments } from '@/src/features/competition/api';
import { useMobileTheme } from '@/src/lib/theme';

type TournamentFilter = 'all' | 'eligible' | 'archived';

function formatDate(value: string | null): string {
  if (!value) return 'TBC';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'TBC'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TournamentsScreen() {
  const router = useRouter();
  const { colors } = useMobileTheme();
  const [filter, setFilter] = useState<TournamentFilter>('all');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['tournaments'],
    queryFn: getTournaments,
    staleTime: 60_000,
  });
  const tournaments = useMemo(() => (query.data ?? []).filter((tournament) => {
    if (filter === 'eligible' && tournament.status !== 'eligible' && tournament.status !== 'active') return false;
    if (filter === 'archived' && tournament.status !== 'archived') return false;
    const term = search.trim().toLowerCase();
    return !term || tournament.name.toLowerCase().includes(term) || (tournament.tier ?? '').toLowerCase().includes(term);
  }), [filter, query.data, search]);

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#fb923c" />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Pro circuit</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Tournaments</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">Browse eligible fantasy events and archived tournaments.</Text>
        </View>
        <TextInput
          accessibilityLabel="Search tournaments"
          autoCapitalize="none"
          autoCorrect={false}
          className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-base text-white"
          onChangeText={setSearch}
          placeholder="Search name or tier"
          placeholderTextColor={colors.placeholder}
          value={search}
        />
        <View className="flex-row gap-2">
          {([
            ['all', 'All'],
            ['eligible', 'Eligible'],
            ['archived', 'Archived'],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              className={`min-h-10 flex-1 items-center justify-center rounded-full border px-2 ${
                filter === value ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
              }`}
              onPress={() => setFilter(value)}
            >
              <Text className={`text-sm font-semibold ${filter === value ? 'text-brand-300' : 'text-slate-300'}`}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {query.isPending ? (
          <View accessibilityLabel="Loading tournaments" className="gap-3">
            {[1, 2, 3].map((item) => <View key={item} className="h-36 rounded-2xl bg-slate-800" />)}
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Tournaments unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load tournaments.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : tournaments.length ? (
          <View className="gap-3">
            {tournaments.map((tournament) => (
              <Pressable
                key={tournament.id}
                accessibilityRole="button"
                accessibilityLabel={`View ${tournament.name} tournament details`}
                className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                onPress={() => router.push(`/tournament/${tournament.id}`)}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-bold text-white">{tournament.name}</Text>
                    <Text className="mt-1 text-xs text-slate-400">{tournament.tier ?? 'Tier not specified'}</Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${
                    tournament.eligible ? 'bg-emerald-500/15' : 'bg-slate-800'
                  }`}>
                    <Text className={`text-xs font-medium ${
                      tournament.eligible ? 'text-emerald-300' : 'text-slate-300'
                    }`}>
                      {tournament.status}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-slate-300">
                  {formatDate(tournament.start_date)} – {formatDate(tournament.end_date)}
                </Text>
                <Text className="text-xs text-slate-400">
                  {tournament.series_count} series · {tournament.participating_teams.length} participating teams
                </Text>
                {tournament.participating_teams.length ? (
                  <Text numberOfLines={3} className="text-xs leading-5 text-slate-500">
                    {tournament.participating_teams.map((team) => team.name).join(' · ')}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-sm text-slate-300">No tournaments match these filters.</Text>
          </View>
        )}
        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Refreshing tournaments" color="#fb923c" /> : null}
      </ScrollView>
    </Screen>
  );
}
