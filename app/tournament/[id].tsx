import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Modal, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { TeamLogo } from '@/src/components/TeamLogo';
import { getTournamentDetails } from '@/src/features/competition/api';
import { TeamMatchup } from '@/src/features/competition/TeamMatchup';
import { TournamentSeriesTimeline } from '@/src/features/competition/TournamentSeriesTimeline';
import { TournamentGroupStandings } from '@/src/features/competition/TournamentGroupStandings';

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

type TabMode = 'matches' | 'series' | 'standings' | 'teams';
type MatchStatusFilter = 'all' | 'live' | 'upcoming' | 'completed';

export default function TournamentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);
  const validId = Number.isSafeInteger(tournamentId) && tournamentId > 0;
  const [activeTab, setActiveTab] = useState<TabMode>('matches');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [filterPickerVisible, setFilterPickerVisible] = useState(false);

  const query = useQuery({
    queryKey: ['tournament-detail', tournamentId],
    queryFn: () => getTournamentDetails(tournamentId),
    enabled: validId,
    staleTime: 60_000,
  });

  const matches = useMemo(() => query.data?.matches ?? [], [query.data?.matches]);

  // Competing teams derived from matches
  const competingTeams = useMemo(() => {
    const teamsMap = new Map<number, { id: number; name: string; tag: string; logo_url?: string | null }>();
    matches.forEach((m) => {
      if (m.radiant_team_id && m.radiant_team) {
        teamsMap.set(m.radiant_team_id, {
          id: m.radiant_team_id,
          name: m.radiant_team.name,
          tag: m.radiant_team.tag,
          logo_url: m.radiant_team.logo_url,
        });
      }
      if (m.dire_team_id && m.dire_team) {
        teamsMap.set(m.dire_team_id, {
          id: m.dire_team_id,
          name: m.dire_team.name,
          tag: m.dire_team.tag,
          logo_url: m.dire_team.logo_url,
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

  const filterOptions = useMemo<
    { key: MatchStatusFilter; label: string; count: number }[]
  >(() => [
    { key: 'all', label: 'All Matches', count: matches.length },
    { key: 'live', label: 'Live Matches', count: liveMatches.length },
    { key: 'upcoming', label: 'Upcoming Matches', count: upcomingMatches.length },
    { key: 'completed', label: 'Completed Matches', count: completedMatches.length },
  ], [matches.length, liveMatches.length, upcomingMatches.length, completedMatches.length]);

  const selectedFilterOption =
    filterOptions.find((opt) => opt.key === statusFilter) ?? filterOptions[0];

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

              {/* 4-Stat 2x2 Grid: Teams, Matches on row 1; Live, Done on row 2 */}
              <View className="gap-2.5 pt-1">
                <View className="flex-row gap-2.5">
                  <View className="flex-1 rounded-xl bg-slate-950 p-3 items-center border border-slate-800/60">
                    <Text className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Teams</Text>
                    <Text className="mt-1 text-lg font-bold text-white font-mono">{competingTeams.length}</Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-slate-950 p-3 items-center border border-slate-800/60">
                    <Text className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Matches</Text>
                    <Text className="mt-1 text-lg font-bold text-white font-mono">{matches.length}</Text>
                  </View>
                </View>
                <View className="flex-row gap-2.5">
                  <View className="flex-1 rounded-xl bg-slate-950 p-3 items-center border border-slate-800/60">
                    <Text className="text-[11px] font-medium uppercase tracking-wider text-amber-400/90">Live</Text>
                    <Text className="mt-1 text-lg font-bold text-amber-400 font-mono">{liveMatches.length}</Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-slate-950 p-3 items-center border border-slate-800/60">
                    <Text className="text-[11px] font-medium uppercase tracking-wider text-emerald-400/90">Done</Text>
                    <Text className="mt-1 text-lg font-bold text-emerald-400 font-mono">{completedMatches.length}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Navigation Tabs: Matches | Series | Standings | Teams */}
            <View className="flex-row rounded-xl border border-slate-800 bg-slate-900 p-1">
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'matches' }}
                className={`flex-1 items-center justify-center rounded-lg py-2 ${
                  activeTab === 'matches' ? 'bg-cyan-500/20 border border-cyan-500/50' : ''
                }`}
                onPress={() => setActiveTab('matches')}
              >
                <Text className={`text-[11px] font-bold ${activeTab === 'matches' ? 'text-cyan-300' : 'text-slate-400'}`}>
                  Matches
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'series' }}
                className={`flex-1 items-center justify-center rounded-lg py-2 ${
                  activeTab === 'series' ? 'bg-cyan-500/20 border border-cyan-500/50' : ''
                }`}
                onPress={() => setActiveTab('series')}
              >
                <Text className={`text-[11px] font-bold ${activeTab === 'series' ? 'text-cyan-300' : 'text-slate-400'}`}>
                  Series
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'standings' }}
                className={`flex-1 items-center justify-center rounded-lg py-2 ${
                  activeTab === 'standings' ? 'bg-cyan-500/20 border border-cyan-500/50' : ''
                }`}
                onPress={() => setActiveTab('standings')}
              >
                <Text className={`text-[11px] font-bold ${activeTab === 'standings' ? 'text-cyan-300' : 'text-slate-400'}`}>
                  Standings
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'teams' }}
                className={`flex-1 items-center justify-center rounded-lg py-2 ${
                  activeTab === 'teams' ? 'bg-cyan-500/20 border border-cyan-500/50' : ''
                }`}
                onPress={() => setActiveTab('teams')}
              >
                <Text className={`text-[11px] font-bold ${activeTab === 'teams' ? 'text-cyan-300' : 'text-slate-400'}`}>
                  Teams
                </Text>
              </Pressable>
            </View>

            {activeTab === 'matches' ? (
              <View className="gap-3">
                {/* Match Status Picker Trigger Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Filter matches: ${selectedFilterOption.label}`}
                  accessibilityState={{ expanded: filterPickerVisible }}
                  className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
                  onPress={() => setFilterPickerVisible(true)}
                >
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className={`h-2.5 w-2.5 rounded-full ${
                        statusFilter === 'live'
                          ? 'bg-rose-500'
                          : statusFilter === 'completed'
                            ? 'bg-emerald-500'
                            : statusFilter === 'upcoming'
                              ? 'bg-cyan-400'
                              : 'bg-slate-500'
                      }`}
                    />
                    <Text className="text-xs font-medium text-slate-400">Filter Matches:</Text>
                    <Text className="text-xs font-bold text-white">
                      {selectedFilterOption.label} ({selectedFilterOption.count})
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-cyan-300">Choose ▾</Text>
                </Pressable>

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
            ) : activeTab === 'series' ? (
              <TournamentSeriesTimeline
                matches={matches}
                onMatchPress={(matchId) => router.push(`/match/${matchId}`)}
              />
            ) : activeTab === 'standings' ? (
              <TournamentGroupStandings
                matches={matches}
                competingTeams={competingTeams}
              />
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
                        <TeamLogo logoUrl={team.logo_url} name={team.name} tag={team.tag} size={40} />
                        <View className="flex-1 min-w-0">
                          <Text className="font-bold text-white text-xs leading-4" numberOfLines={1}>{team.name}</Text>
                          <Text className="text-[10px] text-cyan-300 font-mono mt-0.5">{team.tag || 'PRO'}</Text>
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

      {/* Filter Picker Modal - Outside ScrollView with explicit dark surface styles */}
      <Modal
        animationType="slide"
        transparent
        visible={filterPickerVisible}
        onRequestClose={() => setFilterPickerVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setFilterPickerVisible(false)}
          />
          <View
            style={{
              backgroundColor: '#0f172a',
              borderTopWidth: 1,
              borderColor: '#334155',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 16,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderColor: '#1e293b' }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#2dd4bf' }}>
                  Filter Matches
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: '#94a3b8' }}>
                  Choose which matches to display
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close filter picker"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1e293b',
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
                onPress={() => setFilterPickerVisible(false)}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#cbd5e1' }}>✕</Text>
              </Pressable>
            </View>

            {/* Filter Options List */}
            <View style={{ gap: 8, paddingBottom: 8 }}>
              {filterOptions.map((opt) => {
                const isSelected = statusFilter === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderWidth: 1,
                      backgroundColor: isSelected ? '#1e293b' : '#020617',
                      borderColor: isSelected ? '#2dd4bf' : '#334155',
                    }}
                    onPress={() => {
                      setStatusFilter(opt.key);
                      setFilterPickerVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor:
                            opt.key === 'live'
                              ? '#f43f5e'
                              : opt.key === 'completed'
                                ? '#10b981'
                                : opt.key === 'upcoming'
                                  ? '#22d3ee'
                                  : '#64748b',
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: isSelected ? '700' : '600',
                          color: isSelected ? '#2dd4bf' : '#f8fafc',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          backgroundColor: '#020617',
                          borderWidth: 1,
                          borderColor: '#334155',
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: '600',
                            color: '#94a3b8',
                          }}
                        >
                          {opt.count}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#2dd4bf' }}>✓</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
