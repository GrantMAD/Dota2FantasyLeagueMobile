import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView as HorizontalScrollView, Text, TextInput, View } from 'react-native';
import { getDefaultSeriesGame, groupMatchesBySeries, shouldShowMatchSeries, summarizeMatchSeries } from '@/src/features/competition/match-series';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { getMatchesPage, getTournaments } from '@/src/features/competition/api';
import { getMatchSeriesSquadAppearance } from '@/src/features/competition/match-squad-appearance';
import { MatchSeriesCard } from '@/src/features/competition/MatchSeriesCard';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import {
  getActiveMatchFilterCount,
  getMatchRefreshInterval,
  type MatchListFilter,
} from '@/src/features/competition/match-list-state';
import { useMobileTheme } from '@/src/lib/theme';

const filters = ['all', 'live', 'upcoming', 'completed'] as const;

export default function MatchesScreen() {
  const router = useRouter();
  const { colors } = useMobileTheme();
  const params = useLocalSearchParams<{ gameweekId?: string | string[] }>();
  const rawGameweekId = Array.isArray(params.gameweekId) ? params.gameweekId[0] : params.gameweekId;
  const parsedGameweekId = Number(rawGameweekId);
  const gameweekId = Number.isSafeInteger(parsedGameweekId) && parsedGameweekId > 0
    ? parsedGameweekId
    : undefined;
  const [filter, setFilter] = useState<MatchListFilter>('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [showTournaments, setShowTournaments] = useState(false);
  const [page, setPage] = useState(1);
  const [tournamentSearchDraft, setTournamentSearchDraft] = useState('');
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const hasVisitedMatchesScreen = useRef(false);
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchDraft.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchDraft]);
  useEffect(() => {
    const timeout = setTimeout(() => setTournamentSearch(tournamentSearchDraft.trim()), 250);
    return () => clearTimeout(timeout);
  }, [tournamentSearchDraft]);
  const tournamentsQuery = useQuery({
    queryKey: ['tournaments'],
    queryFn: getTournaments,
    staleTime: 5 * 60_000,
  });
  const query = useQuery({
    queryKey: ['matches', filter, search, tournamentId, gameweekId, page],
    queryFn: () => getMatchesPage({
      status: filter,
      search,
      tournamentId: tournamentId ?? undefined,
      gameweekId,
      page,
    }),
    staleTime: 30_000,
    refetchInterval: (currentQuery) => isScreenFocused
      ? getMatchRefreshInterval(filter, currentQuery.state.data?.counts.live ?? 0)
      : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: isScreenFocused && (filter === 'all' || filter === 'live') ? 'always' : false,
  });
  const refetchMatches = query.refetch;
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      if (hasVisitedMatchesScreen.current) void refetchMatches();
      hasVisitedMatchesScreen.current = true;
      return () => setIsScreenFocused(false);
    }, [refetchMatches]),
  );
  const fantasyQuery = useFantasyContext();
  const ownedPlayers = fantasyQuery.data?.ownedPlayers ?? [];
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.limit)) : 1;
  const allSeriesGroups = groupMatchesBySeries(query.data?.matches ?? []);
  const seriesGroups = allSeriesGroups.filter((group) => shouldShowMatchSeries(group.games));
  const hiddenCompletedMatchCount = allSeriesGroups
    .filter((group) => !shouldShowMatchSeries(group.games))
    .reduce((count, group) => count + group.games.length, 0);
  const liveSeriesCount = seriesGroups.filter((group) => {
    const s = summarizeMatchSeries(group.games);
    return s.isLive && !s.isComplete;
  }).length;
  const activeFilterCount = getActiveMatchFilterCount({
    filter,
    tournamentId,
    search: searchDraft,
    gameweekId,
  });
  const matchingTournaments = (tournamentsQuery.data ?? []).filter((tournament) =>
    tournament.name.toLowerCase().includes(tournamentSearch.toLowerCase()),
  );
  const clearAllFilters = () => {
    setFilter('all');
    setSearchDraft('');
    setSearch('');
    setTournamentId(null);
    setPage(1);
    setTournamentSearchDraft('');
    setTournamentSearch('');
    setShowTournaments(false);
    if (gameweekId !== undefined) router.replace('/matches');
  };
  useEffect(() => {
    if (filter === 'upcoming' && query.data?.counts.upcoming === 0) {
      // Keep the selected tab consistent with refreshed server-side match counts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilter('all');
      setPage(1);
    }
  }, [filter, query.data?.counts.upcoming]);

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
          <Text className="mt-2 text-3xl font-bold text-slate-50">Match Center</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">Live, upcoming, and completed professional matches.</Text>
          <View className="mt-3">
            <DataFreshnessBadge page="matches" />
          </View>
        </View>
        {gameweekId ? (
          <View className="flex-row items-center justify-between gap-3 rounded-xl border border-cyan-800 bg-cyan-950/40 px-4 py-3">
            <Text className="flex-1 text-sm font-medium text-cyan-100">Showing fixtures for Gameweek {gameweekId}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/matches')}
            >
              <Text className="font-semibold text-cyan-300">Clear</Text>
            </Pressable>
          </View>
        ) : null}
        <TextInput
          accessibilityLabel="Search matches"
          value={searchDraft}
          onChangeText={(value) => {
            setSearchDraft(value);
            setPage(1);
          }}
          placeholder="Search teams or tournaments"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-slate-50"
        />
        <View className="flex-row flex-wrap gap-2">
          {filters
            .filter((value) => value !== 'upcoming' || (query.data?.counts.upcoming ?? 0) > 0)
            .map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              className={`min-h-10 justify-center rounded-full border px-4 ${
                filter === value ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
              }`}
              onPress={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              <Text className={`text-sm font-semibold capitalize ${filter === value ? 'text-brand-300' : 'text-slate-300'}`}>
                {value}{query.data ? ` (${query.data.counts[value]})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showTournaments }}
            className="min-h-11 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
            onPress={() => setShowTournaments((shown) => !shown)}
          >
            <Text className="font-semibold text-slate-50">
              {tournamentId === null
                ? 'All tournaments'
                : tournamentsQuery.data?.find((tournament) => tournament.id === tournamentId)?.name ?? 'Selected tournament'}
            </Text>
          </Pressable>
          {showTournaments ? (
            <View className="gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
              <TextInput
                accessibilityLabel="Search tournaments"
                value={tournamentSearchDraft}
                onChangeText={setTournamentSearchDraft}
                placeholder="Find a tournament"
                placeholderTextColor={colors.placeholder}
                className="min-h-10 rounded-lg border border-slate-700 px-3 text-slate-50"
              />
              {tournamentsQuery.isError ? (
                <Text accessibilityRole="alert" className="text-sm text-red-200">
                  {tournamentsQuery.error instanceof Error ? tournamentsQuery.error.message : 'Unable to load tournaments.'}
                </Text>
              ) : tournamentsQuery.isPending ? (
                <ActivityIndicator accessibilityLabel="Loading tournaments" color="#14b8a6" />
              ) : (
                <HorizontalScrollView nestedScrollEnabled className="max-h-48">
                  <View className="gap-1">
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setTournamentId(null);
                        setPage(1);
                        setShowTournaments(false);
                      }}
                      className="rounded-lg px-3 py-2"
                    >
                      <Text className="text-slate-200">All tournaments</Text>
                    </Pressable>
                    {matchingTournaments.map((tournament) => (
                      <Pressable
                        key={tournament.id}
                        accessibilityRole="button"
                        onPress={() => {
                          setTournamentId(tournament.id);
                          setPage(1);
                          setShowTournaments(false);
                        }}
                        className="rounded-lg px-3 py-2"
                      >
                        <Text className="text-slate-200">{tournament.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </HorizontalScrollView>
              )}
            </View>
          ) : null}
        </View>
        {activeFilterCount > 0 ? (
          <View className="flex-row items-center justify-between gap-3">
            <Text
              accessibilityLabel={`${activeFilterCount} active match filter${activeFilterCount === 1 ? '' : 's'}`}
              accessibilityLiveRegion="polite"
              className="text-xs font-medium text-slate-300"
            >
              Filters
              <Text className="font-mono font-bold text-brand-300"> ({activeFilterCount})</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all match filters"
              className="min-h-10 justify-center rounded-lg px-3"
              onPress={clearAllFilters}
            >
              <Text className="text-xs font-semibold text-brand-300">Clear all</Text>
            </Pressable>
          </View>
        ) : null}
        {query.isError && query.data ? (
          <View accessibilityRole="alert" className="gap-2 rounded-xl border border-red-900 bg-red-950 p-4">
            <Text className="font-semibold text-red-200">Could not refresh matches</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to refresh matches.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-red-200">Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {query.isPending ? (
          <View accessibilityLabel="Loading matches" className="gap-3">
            {[1, 2, 3].map((item) => <View key={item} className="h-32 rounded-2xl bg-slate-800" />)}
          </View>
        ) : query.isError && !query.data ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Matches unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load matches.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-red-200">Try again</Text>
            </Pressable>
          </View>
        ) : seriesGroups.length ? (
          <View className="gap-3">
            {/* Live now section header */}
            {liveSeriesCount > 0 && filter !== 'completed' && (
              <View className="flex-row items-center gap-2 px-1">
                <View className="w-2 h-2 rounded-full bg-rose-500" />
                <Text className="text-sm font-black uppercase tracking-wider text-rose-400">
                  Live Now
                </Text>
                <View className="px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30">
                  <Text className="text-[11px] font-bold text-rose-400">{liveSeriesCount}</Text>
                </View>
              </View>
            )}
            {seriesGroups.map((group) => {
              const appearance = getMatchSeriesSquadAppearance(group.games, ownedPlayers);
              const defaultGame = getDefaultSeriesGame(group.games);
              return (
                <MatchSeriesCard
                  key={group.key}
                  group={group}
                  appearance={appearance}
                  onPress={() => router.push(`/match/${defaultGame?.id ?? group.match.id}`)}
                />
              );
            })}
          </View>
        ) : (
          <View className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-sm text-slate-300">
              {hiddenCompletedMatchCount > 0
                ? `${hiddenCompletedMatchCount} completed match${hiddenCompletedMatchCount === 1 ? '' : 'es'} hidden until player stats are available.`
                : `No ${filter === 'all' ? '' : `${filter} `}matches found.`}
            </Text>
          </View>
        )}
        {hiddenCompletedMatchCount > 0 && seriesGroups.length > 0 ? (
          <Text className="text-center text-xs text-slate-500">
            {hiddenCompletedMatchCount} completed match{hiddenCompletedMatchCount === 1 ? '' : 'es'} hidden until player stats are available.
          </Text>
        ) : null}
        {query.data && query.data.total > query.data.limit ? (
          <View className="flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: page <= 1 }}
              disabled={page <= 1}
              onPress={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg px-3 py-2"
            >
              <Text className={page <= 1 ? 'text-slate-600' : 'font-semibold text-cyan-200'}>Previous</Text>
            </Pressable>
            <Text accessibilityLiveRegion="polite" className="text-sm text-slate-300">
              Page {query.data.page} of {totalPages} · {query.data.total} matches
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: page >= totalPages }}
              disabled={page >= totalPages}
              onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg px-3 py-2"
            >
              <Text className={page >= totalPages ? 'text-slate-600' : 'font-semibold text-cyan-200'}>Next</Text>
            </Pressable>
          </View>
        ) : null}
        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Refreshing matches" color="#14b8a6" /> : null}
      </ScrollView>
    </Screen>
  );
}
