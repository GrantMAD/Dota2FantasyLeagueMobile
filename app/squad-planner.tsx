import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView as NativeScrollView, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { Screen } from '@/src/components/Screen';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { getUpcomingFixturesForTeams } from '@/src/features/fantasy/api';
import type { FantasyPlayer, TeamFixture } from '@/src/features/fantasy/api';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

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

function formatDeadline(value: string | null): string {
      if (!value) return 'Deadline not announced';
      const deadline = new Date(value);
      if (Number.isNaN(deadline.getTime())) return 'Deadline not announced';
      const remaining = deadline.getTime() - Date.now();
      const formatted = deadline.toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      if (remaining <= 0) return `${formatted} (passed)`;
      const hours = Math.floor(remaining / 3_600_000);
      const days = Math.floor(hours / 24);
      const timeLeft = days > 0
        ? `${days}d ${hours % 24}h remaining`
        : `${hours}h ${Math.floor((remaining % 3_600_000) / 60_000)}m remaining`;
      return `${formatted} · ${timeLeft}`;
}

function slotLabel(slot: string | undefined): string {
  if (!slot) return 'Not in lineup';
  return slot.split('_').map((part) =>
    part === 'hard' ? 'Hard' : part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
}

export default function SquadPlannerScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [selectedGameweekId, setSelectedGameweekId] = useState<number | undefined>();
  const [isGameweekPickerVisible, setIsGameweekPickerVisible] = useState(false);
  const { theme } = useMobileTheme();
  const contextQuery = useFantasyContext();
  const planningGameweeks = useMemo(() => {
    const gameweeks = contextQuery.data?.availableGameweeks ?? [];
    const currentGameweek = contextQuery.data?.gameweek;
    const withCurrentGameweek = currentGameweek && !gameweeks.some((gameweek) => gameweek.id === currentGameweek.id)
      ? [...gameweeks, currentGameweek]
      : gameweeks;
    return [...withCurrentGameweek].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return a.gameweekNumber - b.gameweekNumber;
    });
  }, [contextQuery.data?.availableGameweeks, contextQuery.data?.gameweek]);
  const defaultPlanningGameweek = planningGameweeks.find((gameweek) => gameweek.status === 'active')
    ?? planningGameweeks.find((gameweek) => gameweek.id === contextQuery.data?.gameweek?.id)
    ?? planningGameweeks[0]
    ?? null;
  const activeGameweekId = selectedGameweekId
    ?? defaultPlanningGameweek?.id
    ?? contextQuery.data?.defaultGameweekId
    ?? undefined;
  const lineupContextQuery = useFantasyContext(activeGameweekId);
  const selectedGameweek = planningGameweeks.find((gameweek) => gameweek.id === activeGameweekId)
    ?? contextQuery.data?.gameweek
    ?? null;
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
    queryFn: () => getUpcomingFixturesForTeams(teamIds),
    enabled: Boolean(session?.user.id && contextQuery.data && teamIds.length > 0),
    staleTime: 60_000,
  });
  const lineupByPlayer = useMemo(
    () => new Map((lineupContextQuery.data?.lineup ?? []).map((entry) => [entry.player_id, entry])),
    [lineupContextQuery.data?.lineup]
  );
  const fixturesByTeam = useMemo(() => {
    const result = new Map<number, TeamFixture[]>();
    for (const fixture of fixtureQuery.data?.fixtures ?? []) {
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
  const refreshing = contextQuery.isRefetching || lineupContextQuery.isRefetching || fixtureQuery.isRefetching;

  async function refresh() {
    await Promise.all([contextQuery.refetch(), lineupContextQuery.refetch(), fixtureQuery.refetch()]);
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#14b8a6" />
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
                {selectedGameweek
                  ? `Gameweek ${selectedGameweek.gameweekNumber}`
                  : 'No active gameweek'}
              </Text>
              <Text className="text-sm text-slate-300">
                {selectedGameweek?.isLocked
                  ? 'The current lineup is locked.'
                  : selectedGameweek?.deadline
                    ? formatDeadline(selectedGameweek.deadline)
                    : 'No upcoming deadline is available.'}
              </Text>
              <View className="flex-row flex-wrap gap-2 border-t border-slate-800 pt-3">
                <Pressable
                  accessibilityRole="button"
                  className="min-h-10 justify-center rounded-lg bg-cyan-500 px-4"
                  onPress={() => router.push('/(tabs)/team?tab=lineup')}
                >
                  <Text className="font-semibold text-slate-950">
                    {selectedGameweek?.isLocked ? 'View lineup' : 'Set lineup'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="min-h-10 justify-center rounded-lg border border-slate-700 bg-slate-950/60 px-4"
                  onPress={() => {
                    if (selectedGameweek) {
                      router.push({ pathname: '/matches', params: { gameweekId: String(selectedGameweek.id) } });
                    } else {
                      router.push('/matches');
                    }
                  }}
                >
                  <Text className="font-medium text-slate-200">Gameweek fixtures</Text>
                </Pressable>
              </View>
              {planningGameweeks.length > 1 ? (
                <View className="gap-2 border-t border-slate-800 pt-3">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plan another open gameweek</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isGameweekPickerVisible }}
                    accessibilityLabel={`Selected gameweek ${selectedGameweek?.gameweekNumber ?? 'unavailable'}. Choose planning gameweek`}
                    disabled={lineupContextQuery.isFetching}
                    className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-950/60 px-4"
                    onPress={() => setIsGameweekPickerVisible(true)}
                  >
                    <Text className="font-semibold text-white">
                      {selectedGameweek ? `Gameweek ${selectedGameweek.gameweekNumber}` : 'Select gameweek'}
                    </Text>
                    <SymbolView
                      name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                      size={20}
                      tintColor={theme === 'dark' ? '#2dd4bf' : '#0f766e'}
                    />
                  </Pressable>
                  {lineupContextQuery.isFetching ? (
                    <Text accessibilityLiveRegion="polite" className="text-xs text-slate-400">
                      Loading selected gameweek lineup and fixtures…
                    </Text>
                  ) : null}
                  {lineupContextQuery.isError ? (
                    <View accessibilityRole="alert" className="gap-2">
                      <Text className="text-xs leading-5 text-rose-200">
                        {lineupContextQuery.error instanceof Error
                          ? lineupContextQuery.error.message
                          : 'Unable to load the selected gameweek lineup.'}
                      </Text>
                      <Pressable accessibilityRole="button" onPress={() => void lineupContextQuery.refetch()}>
                        <Text className="text-sm font-semibold text-white">Retry gameweek</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Squad status</Text>
              <Text className="text-2xl font-bold text-white">{players.length} players</Text>
              <Text className={`${unavailableCount ? 'text-amber-300' : 'text-emerald-300'} text-sm`}>
                {unavailableCount
                  ? `${unavailableCount} unavailable or status unconfirmed`
                  : 'All players currently marked available'}
              </Text>
              <Text className="text-xs text-slate-400">Review the latest lineup status before the deadline.</Text>
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-lg font-bold text-white">My squad availability</Text>
                <Text className="mt-1 text-sm text-slate-400">Role, status, and upcoming fixtures for your owned players.</Text>
              </View>
              {players.map((player) => {
                const lineupEntry = lineupByPlayer.get(player.id);
                const fixtures = player.professional_teams?.id
                  ? fixturesByTeam.get(player.professional_teams.id) ?? []
                  : [];
                const fixturesUnavailable = player.professional_teams?.id != null
                  && fixtureQuery.data?.failedTeamIds.includes(player.professional_teams.id);
                const isAvailable = player.availability_status === 'available';
                return (
                  <View key={player.id} className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <Pressable
                        accessibilityRole="link"
                        className="min-w-0 flex-1 flex-row items-center gap-3"
                        onPress={() => router.push({ pathname: '/player/[id]', params: { id: String(player.id) } })}
                      >
                        <PlayerAvatar uri={player.profile_image_url} label={playerName(player)} size={42} />
                        <View className="min-w-0 flex-1">
                          <Text numberOfLines={1} className="font-semibold text-white">{playerName(player)}</Text>
                          <Text numberOfLines={1} className="mt-1 text-xs text-slate-400">
                          {player.professional_teams?.name ?? 'Free agent'} · {player.primary_role ?? 'Role unassigned'}
                          </Text>
                        </View>
                      </Pressable>
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
                        {player.current_price > 0 ? `$${player.current_price.toFixed(1)}M` : 'Price unavailable'}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {fixturesUnavailable
                          ? 'Fixtures unavailable'
                          : `${fixtures.length} upcoming fixture${fixtures.length === 1 ? '' : 's'}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-lg font-bold text-white">Upcoming squad fixtures</Text>
                <Text className="mt-1 text-sm text-slate-400">Next scheduled matches for teams represented in your squad.</Text>
              </View>
              {fixtureQuery.data?.failedTeamIds.length ? (
                <View accessibilityRole="alert" className="gap-3 rounded-xl border border-amber-800 bg-amber-950/70 p-4">
                  <Text className="text-sm leading-5 text-amber-100">
                    Unable to load fixtures for {fixtureQuery.data.failedTeamIds
                      .map((teamId) => players.find((player) => player.professional_teams?.id === teamId)?.professional_teams?.name ?? `team ${teamId}`)
                      .join(', ')}. Other available fixtures are still shown.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={fixtureQuery.isFetching}
                    onPress={() => void fixtureQuery.refetch()}
                  >
                    <Text className="font-semibold text-white">
                      {fixtureQuery.isFetching ? 'Retrying fixtures…' : 'Retry fixtures'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {fixtureQuery.isPending ? (
                <ActivityIndicator accessibilityLabel="Loading squad fixtures" color="#14b8a6" />
              ) : fixtureQuery.isError ? (
                <View accessibilityRole="alert" className="gap-2 rounded-xl border border-red-900 bg-red-950 p-4">
                  <Text className="text-sm leading-5 text-red-200">
                    {fixtureQuery.error instanceof Error ? fixtureQuery.error.message : 'Unable to load team fixtures.'}
                  </Text>
                  <Pressable accessibilityRole="button" onPress={() => void fixtureQuery.refetch()}>
                    <Text className="font-semibold text-white">Retry fixtures</Text>
                  </Pressable>
                </View>
              ) : fixtureQuery.data?.fixtures.length ? (
                fixtureQuery.data.fixtures.map((fixture) => {
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
              ) : fixtureQuery.data?.failedTeamIds.length ? (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm leading-5 text-slate-400">No fixtures are available for the teams that loaded successfully.</Text>
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
      {planningGameweeks.length > 1 ? (
        <Modal
          accessibilityViewIsModal
          animationType="fade"
          onRequestClose={() => setIsGameweekPickerVisible(false)}
          presentationStyle="overFullScreen"
          statusBarTranslucent
          transparent
          visible={isGameweekPickerVisible}
        >
          <View
            className="flex-1 justify-center px-5"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: theme === 'dark' ? 'rgba(2, 6, 23, 0.82)' : 'rgba(15, 23, 42, 0.55)',
            }}
          >
            <View
              className="gap-3 rounded-2xl border p-4"
              style={{
                maxHeight: '70%',
                borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
                backgroundColor: theme === 'dark' ? '#020617' : '#ffffff',
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold" style={{ color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}>
                  Select gameweek
                </Text>
                <Pressable
                  accessibilityRole="button"
                  className="min-h-10 justify-center px-2"
                  onPress={() => setIsGameweekPickerVisible(false)}
                >
                  <Text className="font-semibold" style={{ color: theme === 'dark' ? '#5eead4' : '#0f766e' }}>
                    Close
                  </Text>
                </Pressable>
              </View>
              <NativeScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
              >
                {planningGameweeks.map((gameweek) => {
                  const isSelected = gameweek.id === activeGameweekId;
                  const isActive = gameweek.status === 'active';
                  return (
                    <Pressable
                      key={gameweek.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Gameweek ${gameweek.gameweekNumber}${isActive ? ', active' : ''}`}
                      className="min-h-14 flex-row items-center justify-between rounded-xl border px-4 py-2"
                      style={{
                        borderColor: isSelected
                          ? theme === 'dark' ? '#14b8a6' : '#0f766e'
                          : theme === 'dark' ? '#334155' : '#cbd5e1',
                        backgroundColor: isSelected
                          ? theme === 'dark' ? 'rgba(20, 184, 166, 0.16)' : '#ccfbf1'
                          : theme === 'dark' ? '#0f172a' : '#f8fafc',
                      }}
                      onPress={() => {
                        setSelectedGameweekId(
                          gameweek.id === defaultPlanningGameweek?.id ? undefined : gameweek.id
                        );
                        setIsGameweekPickerVisible(false);
                      }}
                    >
                      <View>
                        <Text
                          className="text-sm font-bold"
                          style={{
                            color: isSelected
                              ? theme === 'dark' ? '#5eead4' : '#115e59'
                              : theme === 'dark' ? '#f8fafc' : '#0f172a',
                          }}
                        >
                          Gameweek {gameweek.gameweekNumber}
                        </Text>
                        {isActive ? (
                          <Text className="mt-1 text-xs font-semibold" style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857' }}>
                            Active gameweek
                          </Text>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <Text className="text-xs font-semibold" style={{ color: theme === 'dark' ? '#5eead4' : '#0f766e' }}>
                          Selected
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </NativeScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}
