import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { getUpcomingTeamFixtures } from '@/src/features/fantasy/api';
import type { FantasyPlayer, TeamFixture } from '@/src/features/fantasy/api';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { useAuth } from '@/src/lib/auth';

function playerName(player: FantasyPlayer): string {
  return player.in_game_name || player.name;
}

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

function slotLabel(slot: string | undefined): string {
  if (!slot) return 'Not in lineup';
  return slot.split('_').map((part) =>
    part === 'hard' ? 'Hard' : part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
}

export default function SquadPlannerScreen() {
  const { session } = useAuth();
  const contextQuery = useFantasyContext();
  const players = useMemo(
    () => contextQuery.data?.ownedPlayers ?? [],
    [contextQuery.data?.ownedPlayers]
  );
  const teamIds = useMemo(
    () => [...new Set(players.flatMap((player) => player.professional_teams?.id ?? []))].sort((a, b) => a - b),
    [players]
  );
  const fixtureQuery = useQuery({
    queryKey: ['squad-fixtures', session?.user.id, teamIds],
    queryFn: async () => {
      const results = await Promise.all(teamIds.map(async (teamId) => ({
        teamId,
        fixtures: await getUpcomingTeamFixtures(teamId),
      })));
      const byMatchId = new Map<number, TeamFixture>();
      results.forEach(({ fixtures }) => fixtures.forEach((fixture) => byMatchId.set(fixture.id, fixture)));
      return [...byMatchId.values()].sort(
        (a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
      );
    },
    enabled: Boolean(session?.user.id && contextQuery.data && teamIds.length > 0),
    staleTime: 60_000,
  });
  const lineupByPlayer = useMemo(
    () => new Map((contextQuery.data?.lineup ?? []).map((entry) => [entry.player_id, entry])),
    [contextQuery.data?.lineup]
  );
  const fixturesByTeam = useMemo(() => {
    const result = new Map<number, TeamFixture[]>();
    for (const fixture of fixtureQuery.data ?? []) {
      for (const teamId of [fixture.team_a_id, fixture.team_b_id]) {
        if (teamId === null) continue;
        const fixtures = result.get(teamId) ?? [];
        fixtures.push(fixture);
        result.set(teamId, fixtures);
      }
    }
    return result;
  }, [fixtureQuery.data]);
  const unavailableCount = players.filter((player) => player.availability_status !== 'available').length;
  const refreshing = contextQuery.isRefetching || fixtureQuery.isRefetching;

  async function refresh() {
    await Promise.all([contextQuery.refetch(), fixtureQuery.refetch()]);
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#fb923c" />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Team planning</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Squad Planner</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Check player availability, your lineup, and upcoming fixtures for your teams.
          </Text>
        </View>

        {contextQuery.isPending ? (
          <View accessibilityLabel="Loading squad planner" className="gap-3">
            <View className="h-24 rounded-2xl bg-slate-800" />
            <View className="h-40 rounded-2xl bg-slate-800" />
          </View>
        ) : contextQuery.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Squad planner unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {contextQuery.error instanceof Error ? contextQuery.error.message : 'Unable to load your fantasy squad.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void contextQuery.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : players.length === 0 ? (
          <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <Text className="font-semibold text-white">Your squad is empty</Text>
            <Text className="text-sm leading-5 text-slate-400">
              Build your squad to see player availability and upcoming team fixtures here.
            </Text>
            <Link href="/(tabs)/team" asChild>
              <Pressable accessibilityRole="button" className="min-h-11 justify-center">
                <Text className="font-semibold text-brand-300">Build your squad</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <>
            <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Planning window</Text>
              <Text className="text-2xl font-bold text-white">
                {contextQuery.data?.gameweek
                  ? `Gameweek ${contextQuery.data.gameweek.gameweekNumber}`
                  : 'No active gameweek'}
              </Text>
              <Text className="text-sm text-slate-300">
                {contextQuery.data?.gameweek?.isLocked
                  ? 'The current lineup is locked.'
                  : contextQuery.data?.gameweek?.deadline
                    ? `Deadline ${formatDate(contextQuery.data.gameweek.deadline)}`
                    : 'No upcoming deadline is available.'}
              </Text>
              <Text className={`${unavailableCount ? 'text-amber-300' : 'text-emerald-300'} text-sm`}>
                {unavailableCount
                  ? `${unavailableCount} player${unavailableCount === 1 ? '' : 's'} unavailable or without a confirmed availability status`
                  : 'All players currently marked available'}
              </Text>
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-lg font-bold text-white">My squad availability</Text>
                <Text className="mt-1 text-sm text-slate-400">Player status, lineup role, and fixture count.</Text>
              </View>
              {players.map((player) => {
                const lineupEntry = lineupByPlayer.get(player.id);
                const fixtures = player.professional_teams?.id
                  ? fixturesByTeam.get(player.professional_teams.id) ?? []
                  : [];
                const isAvailable = player.availability_status === 'available';
                return (
                  <View key={player.id} className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-semibold text-white">{playerName(player)}</Text>
                        <Text className="mt-1 text-xs text-slate-400">
                          {player.professional_teams?.name ?? 'Free agent'} · {player.primary_role ?? 'Role unassigned'}
                        </Text>
                      </View>
                      <View className={`rounded-full px-2.5 py-1 ${isAvailable ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                        <Text className={`text-xs font-medium ${isAvailable ? 'text-emerald-300' : 'text-amber-200'}`}>
                          {player.availability_status ?? 'Unknown'}
                        </Text>
                      </View>
                    </View>
                    {!isAvailable && player.availability_reason ? (
                      <Text className="text-xs leading-5 text-amber-200/80">{player.availability_reason}</Text>
                    ) : null}
                    <View className="flex-row flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-3">
                      <Text className="text-xs text-slate-400">{slotLabel(lineupEntry?.slot)}</Text>
                      {lineupEntry?.is_captain ? <Text className="text-xs font-medium text-amber-300">Captain</Text> : null}
                      {lineupEntry?.is_vice_captain ? <Text className="text-xs font-medium text-amber-200">Vice-captain</Text> : null}
                      <Text className="text-xs text-slate-400">
                        {fixtures.length} upcoming fixture{fixtures.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-lg font-bold text-white">Upcoming squad fixtures</Text>
                <Text className="mt-1 text-sm text-slate-400">Scheduled matches for teams represented in your squad.</Text>
              </View>
              {fixtureQuery.isPending ? (
                <ActivityIndicator accessibilityLabel="Loading squad fixtures" color="#fb923c" />
              ) : fixtureQuery.isError ? (
                <View accessibilityRole="alert" className="gap-2 rounded-xl border border-red-900 bg-red-950 p-4">
                  <Text className="text-sm leading-5 text-red-200">
                    {fixtureQuery.error instanceof Error ? fixtureQuery.error.message : 'Unable to load team fixtures.'}
                  </Text>
                  <Pressable accessibilityRole="button" onPress={() => void fixtureQuery.refetch()}>
                    <Text className="font-semibold text-white">Retry fixtures</Text>
                  </Pressable>
                </View>
              ) : fixtureQuery.data?.length ? (
                fixtureQuery.data.map((fixture) => {
                  const involvedPlayers = players.filter((player) =>
                    player.professional_teams?.id === fixture.team_a_id ||
                    player.professional_teams?.id === fixture.team_b_id
                  );
                  return (
                    <View key={fixture.id} className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <Text className="font-semibold text-white">
                        {fixture.team_a?.name ?? 'Team TBA'} <Text className="text-slate-500">vs</Text> {fixture.team_b?.name ?? 'Team TBA'}
                      </Text>
                      <Text className="text-sm text-cyan-200">{formatDate(fixture.scheduled_time)}</Text>
                      {fixture.tournament_name ? (
                        <Text className="text-xs text-slate-400">{fixture.tournament_name}</Text>
                      ) : null}
                      {involvedPlayers.length ? (
                        <Text className="text-xs leading-5 text-slate-400">
                          Your squad: {involvedPlayers.map(playerName).join(', ')}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              ) : teamIds.length === 0 ? (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm leading-5 text-slate-400">No team schedule is available for your current squad.</Text>
                </View>
              ) : (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm leading-5 text-slate-400">No upcoming fixtures found for your squad.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
