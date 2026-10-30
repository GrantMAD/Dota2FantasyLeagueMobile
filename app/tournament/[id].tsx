import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { getTournamentDetails } from '@/src/features/competition/api';
import { TeamMatchup } from '@/src/features/competition/TeamMatchup';

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

type TabMode = 'matches' | 'teams';
type MatchStatusFilter = 'all' | 'live' | 'upcoming' | 'completed';

export default function TournamentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);
  const validId = Number.isSafeInteger(tournamentId) && tournamentId > 0;
  const [activeTab, setActiveTab] = useState<TabMode>('matches');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');

  const query = useQuery({
    queryKey: ['tournament-detail', tournamentId],
    queryFn: () => getTournamentDetails(tournamentId),
    enabled: validId,
    staleTime: 60_000,
  });

  const matches = useMemo(() => query.data?.matches ?? [], [query.data?.matches]);

  // Competing teams derived from matches
  const competingTeams = useMemo(() => {
    const teamsMap = new Map<number, { id: number; name: string; tag: string }>();
    matches.forEach((m) => {
      if (m.radiant_team_id && m.radiant_team) {
        teamsMap.set(m.radiant_team_id, {
          id: m.radiant_team_id,
          name: m.radiant_team.name,
          tag: m.radiant_team.tag,
        });
      }
      if (m.dire_team_id && m.dire_team) {
        teamsMap.set(m.dire_team_id, {
          id: m.dire_team_id,
          name: m.dire_team.name,
          tag: m.dire_team.tag,
        });
      }
    });
    return Array.from(teamsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  const completedMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'completed');
  }, [matches]);

  const liveMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'live' || m.status === 'in_progress');
  }, [matches]);

  const upcomingMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'scheduled' || m.status === 'upcoming');
  }, [matches]);

  const completionPct = matches.length > 0
    ? Math.round((completedMatches.length / matches.length) * 100)
    : 0;

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (statusFilter === 'live') return m.status === 'live' || m.status === 'in_progress';
      if (statusFilter === 'upcoming') return m.status === 'scheduled' || m.status === 'upcoming';
      if (statusFilter === 'completed') return m.status === 'completed';
      return true;
    }).sort((a, b) => {
      const statusOrder = (status: string) => (status === 'live' || status === 'in_progress') ? 0 : status === 'scheduled' ? 1 : 2;
      const statusDiff = statusOrder(a.status) - statusOrder(b.status);
      if (statusDiff !== 0) return statusDiff;
      const timeA = new Date(a.scheduled_at).getTime();
      const timeB = new Date(b.scheduled_at).getTime();
      return a.status === 'completed' ? timeB - timeA : timeA - timeB;
    });
  }, [matches, statusFilter]);

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
            {/* Header & Stats Strip */}
            <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Tournament Hub</Text>
                <Text className="mt-1 text-2xl font-bold text-white">{query.data.tournament.name}</Text>
                <Text className="mt-0.5 text-xs text-slate-400">{query.data.tournament.tier ?? 'Pro Circuit Event'}</Text>
              </View>

              {/* Progress bar */}
              <View className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-slate-400">Tournament Progress</Text>
                  <Text className="text-xs font-bold text-emerald-400">{completionPct}% complete</Text>
                </View>
                <View className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <View
                    style={{ width: `${Math.min(100, Math.max(2, completionPct))}%` }}
                    className="h-full rounded-full bg-emerald-500"
                  />
                </View>
              </View>

              {/* 4-Stat Strip */}
              <View className="flex-row gap-2 pt-1">
                <View className="flex-1 rounded-xl bg-slate-950 p-2.5 text-center">
                  <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500 text-center">Teams</Text>
                  <Text className="mt-1 text-base font-bold text-white text-center">{competingTeams.length}</Text>
                </View>
                <View className="flex-1 rounded-xl bg-slate-950 p-2.5 text-center">
                  <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500 text-center">Matches</Text>
                  <Text className="mt-1 text-base font-bold text-white text-center">{matches.length}</Text>
                </View>
                <View className="flex-1 rounded-xl bg-slate-950 p-2.5 text-center">
                  <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500 text-center">Live</Text>
                  <Text className="mt-1 text-base font-bold text-amber-400 text-center">{liveMatches.length}</Text>
                </View>
                <View className="flex-1 rounded-xl bg-slate-950 p-2.5 text-center">
                  <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500 text-center">Done</Text>
                  <Text className="mt-1 text-base font-bold text-emerald-400 text-center">{completedMatches.length}</Text>
                </View>
              </View>
            </View>

            {/* Navigation Tabs: Matches vs Competing Teams */}
            <View className="flex-row rounded-xl border border-slate-800 bg-slate-900 p-1">
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'matches' }}
                className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
                  activeTab === 'matches' ? 'bg-cyan-500/20 border border-cyan-500/50' : ''
                }`}
                onPress={() => setActiveTab('matches')}
              >
                <Text className={`text-xs font-bold ${activeTab === 'matches' ? 'text-cyan-300' : 'text-slate-400'}`}>
                  Matches ({matches.length})
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'teams' }}
                className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
                  activeTab === 'teams' ? 'bg-cyan-500/20 border border-cyan-500/50' : ''
                }`}
                onPress={() => setActiveTab('teams')}
              >
                <Text className={`text-xs font-bold ${activeTab === 'teams' ? 'text-cyan-300' : 'text-slate-400'}`}>
                  Competing Teams ({competingTeams.length})
                </Text>
              </Pressable>
            </View>

            {activeTab === 'matches' ? (
              <View className="gap-3">
                {/* Match Status Filters */}
                <View className="flex-row gap-1.5">
                  {([
                    ['all', `All (${matches.length})`],
                    ['live', `Live (${liveMatches.length})`],
                    ['upcoming', `Upcoming (${upcomingMatches.length})`],
                    ['completed', `Done (${completedMatches.length})`],
                  ] as const).map(([status, label]) => (
                    <Pressable
                      key={status}
                      accessibilityRole="button"
                      accessibilityState={{ selected: statusFilter === status }}
                      className={`flex-1 items-center justify-center rounded-full border py-1.5 px-1 ${
                        statusFilter === status
                          ? 'border-brand-500 bg-brand-500/15'
                          : 'border-slate-800 bg-slate-900'
                      }`}
                      onPress={() => setStatusFilter(status)}
                    >
                      <Text className={`text-[11px] font-semibold ${
                        statusFilter === status ? 'text-brand-300' : 'text-slate-400'
                      }`}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Match Cards */}
                {filteredMatches.length ? filteredMatches.map((match) => (
                  <Pressable
                    key={match.id}
                    accessibilityRole="button"
                    className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                    onPress={() => router.push(`/match/${match.id}`)}
                  >
                    <TeamMatchup radiantTeam={match.radiant_team} direTeam={match.dire_team} />
                    <View className="flex-row items-center justify-between border-t border-slate-800/80 pt-2.5">
                      <Text className="text-xs text-cyan-200">{formatDate(match.scheduled_at)}</Text>
                      <View className="flex-row items-center gap-1.5">
                        <View className={`rounded-full px-2 py-0.5 ${
                          match.status === 'live' || match.status === 'in_progress'
                            ? 'bg-red-500/20 border border-red-500/30'
                            : match.status === 'completed'
                              ? 'bg-emerald-500/20 border border-emerald-500/30'
                              : 'bg-slate-800'
                        }`}>
                          <Text className={`text-[10px] font-bold uppercase ${
                            match.status === 'live' || match.status === 'in_progress'
                              ? 'text-red-400'
                              : match.status === 'completed'
                                ? 'text-emerald-300'
                                : 'text-slate-400'
                          }`}>
                            {match.status}
                          </Text>
                        </View>
                        <Text className="text-[10px] uppercase text-slate-500">Bo{match.best_of}</Text>
                      </View>
                    </View>
                  </Pressable>
                )) : (
                  <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <Text className="text-sm text-slate-400">No matches found for this filter.</Text>
                  </View>
                )}
              </View>
            ) : (
              /* Competing Teams Tab */
              <View className="gap-3">
                {competingTeams.length ? (
                  <View className="flex-row flex-wrap gap-2.5">
                    {competingTeams.map((team) => (
                      <View
                        key={team.id}
                        className="min-w-[47%] flex-1 flex-row items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3.5"
                      >
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-950 border border-slate-800">
                          <Text className="text-xs font-black text-cyan-400 font-mono">
                            {(team.tag || team.name).substring(0, 3).toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-bold text-white" numberOfLines={1}>{team.name}</Text>
                          <Text className="text-xs text-slate-400 font-mono">{team.tag || 'PRO'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <Text className="text-sm text-slate-400">No teams registered for this tournament yet.</Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
