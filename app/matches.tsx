import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView as HorizontalScrollView, Text, TextInput, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { getMatchesPage, getTournaments } from '@/src/features/competition/api';
import { TeamMatchup } from '@/src/features/competition/TeamMatchup';

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
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [showTournaments, setShowTournaments] = useState(false);
  const [page, setPage] = useState(1);
  const [tournamentSearchDraft, setTournamentSearchDraft] = useState('');
  const [tournamentSearch, setTournamentSearch] = useState('');
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
    queryKey: ['matches', filter, search, tournamentId, page],
    queryFn: () => getMatchesPage({ status: filter, search, tournamentId: tournamentId ?? undefined, page }),
    staleTime: 30_000,
  });
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.limit)) : 1;
  const matchingTournaments = (tournamentsQuery.data ?? []).filter((tournament) =>
    tournament.name.toLowerCase().includes(tournamentSearch.toLowerCase()),
  );

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
          <View className="mt-3">
            <DataFreshnessBadge page="matches" />
          </View>
        </View>
        <TextInput
          accessibilityLabel="Search matches"
          value={searchDraft}
          onChangeText={(value) => {
            setSearchDraft(value);
            setPage(1);
          }}
          placeholder="Search teams or tournaments"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-white"
        />
        <View className="flex-row flex-wrap gap-2">
          {filters.map((value) => (
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
            <Text className="font-semibold text-white">
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
                placeholderTextColor="#94a3b8"
                className="min-h-10 rounded-lg border border-slate-700 px-3 text-white"
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
        ) : query.data.matches.length ? (
          <View className="gap-3">
            {query.data.matches.map((match) => (
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
                <TeamMatchup radiantTeam={match.radiant_team} direTeam={match.dire_team} />
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
