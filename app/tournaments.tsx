import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { getTournaments } from '@/src/features/competition/api';
import { useMobileTheme } from '@/src/lib/theme';

type TournamentFilter = 'all' | 'eligible' | 'archived';
type TierFilter = 'all' | 'Tier 1' | 'Tier 2';

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
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['tournaments'],
    queryFn: getTournaments,
    staleTime: 60_000,
  });

  const featuredTournament = useMemo(() => {
    return (query.data ?? []).find(
      (t) => (t.eligible || t.status === 'eligible' || t.status === 'active') && (t.tier === 'Tier 1' || !t.tier)
    ) ?? query.data?.[0] ?? null;
  }, [query.data]);

  const tournaments = useMemo(() => (query.data ?? []).filter((tournament) => {
    if (filter === 'eligible' && tournament.status !== 'eligible' && tournament.status !== 'active') return false;
    if (filter === 'archived' && tournament.status !== 'archived') return false;
    if (tierFilter !== 'all') {
      const tTier = (tournament.tier ?? '').toLowerCase();
      if (!tTier.includes(tierFilter.toLowerCase())) return false;
    }
    const term = search.trim().toLowerCase();
    return !term || tournament.name.toLowerCase().includes(term) || (tournament.tier ?? '').toLowerCase().includes(term);
  }), [filter, query.data, search, tierFilter]);

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#14b8a6" />
        }
      >
        <Pressable
          accessibilityRole="button"
          className="min-h-10 justify-center self-start"
          onPress={() => router.replace('/(tabs)/discover')}
        >
          <Text className="font-semibold text-brand-300">‹ Back to Discover</Text>
        </Pressable>
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Pro circuit</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Tournaments</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">Browse eligible fantasy events and archived tournaments.</Text>
          <View className="mt-3">
            <DataFreshnessBadge page="tournaments" />
          </View>
        </View>
        {/* Featured Tournament Hero */}
        {featuredTournament ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Featured event: ${featuredTournament.name}`}
            className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 p-5 shadow-lg"
            onPress={() => router.push(`/tournament/${featuredTournament.id}`)}
          >
            <View className="flex-row items-center justify-between">
              <View className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Featured Event
                </Text>
              </View>
              {featuredTournament.eligible ? (
                <View className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-emerald-300">✓ Fantasy Eligible</Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-2 text-xl font-extrabold text-white">{featuredTournament.name}</Text>
            <Text className="mt-1 text-xs text-slate-400">
              {featuredTournament.tier ?? 'Pro Tier'} · {formatDate(featuredTournament.start_date)} – {formatDate(featuredTournament.end_date)}
            </Text>
            <View className="mt-3 flex-row items-center justify-between border-t border-slate-800/80 pt-3">
              <Text className="text-xs text-slate-400">
                {featuredTournament.series_count} series · {featuredTournament.participating_teams.length} teams
              </Text>
              <Text className="text-xs font-bold text-amber-400">View tournament →</Text>
            </View>
          </Pressable>
        ) : null}

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
        {/* Status and Tier Filter Pills */}
        <View className="gap-2">
          <View className="flex-row gap-2">
            {([
              ['all', 'All Statuses'],
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
                <Text className={`text-xs font-semibold ${filter === value ? 'text-brand-300' : 'text-slate-300'}`}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row gap-2">
            {([
              ['all', 'All Tiers'],
              ['Tier 1', 'Tier 1'],
              ['Tier 2', 'Tier 2'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: tierFilter === value }}
                className={`min-h-9 flex-1 items-center justify-center rounded-full border px-2 ${
                  tierFilter === value ? 'border-amber-500/60 bg-amber-500/15' : 'border-slate-800 bg-slate-950'
                }`}
                onPress={() => setTierFilter(value)}
              >
                <Text className={`text-xs font-medium ${tierFilter === value ? 'text-amber-300' : 'text-slate-400'}`}>{label}</Text>
              </Pressable>
            ))}
          </View>
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
        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Refreshing tournaments" color="#14b8a6" /> : null}
      </ScrollView>
    </Screen>
  );
}
