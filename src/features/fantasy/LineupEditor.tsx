import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import type { FantasyContext, FantasyLineupEntry, FantasyPlayer, TeamFixture } from './api';
import { getFixtureDifficultyForTeams, getUpcomingFixturesForTeams, saveLineup } from './api';
import { FixtureDifficultyBadge } from './FixtureDifficultyBadge';
import type { FixtureDifficultyResult } from './fixture-difficulty';
import { useMobileTheme } from '@/src/lib/theme';
import { useMobileFeedback } from '@/src/components/MobileFeedbackProvider';

const STARTER_SLOTS = ['carry', 'mid', 'offlane', 'support', 'hard_support'] as const;
const BENCH_SLOTS = ['bench_1', 'bench_2', 'bench_3'] as const;
const ALL_SLOTS = [...STARTER_SLOTS, ...BENCH_SLOTS] as const;
type LineupSlot = (typeof ALL_SLOTS)[number];

const SLOT_LABELS: Record<LineupSlot, string> = {
  carry: 'Carry',
  mid: 'Mid',
  offlane: 'Offlane',
  support: 'Support',
  hard_support: 'Hard Support',
  bench_1: 'Bench 1',
  bench_2: 'Bench 2',
  bench_3: 'Bench 3',
};

function normalizeRole(role: string | null): string {
  return role?.trim().toLowerCase().replaceAll(' ', '_') ?? '';
}

function isEligibleForSlot(player: FantasyPlayer, slot: LineupSlot): boolean {
  const role = normalizeRole(player.primary_role);
  if (slot === 'carry' || slot === 'mid' || slot === 'offlane') return role === slot;
  if (slot === 'support' || slot === 'hard_support') return role === 'support' || role === 'hard_support';
  return true;
}

function makeLineupEntry(
  slot: LineupSlot,
  player: FantasyPlayer,
  existing: FantasyLineupEntry | undefined
): FantasyLineupEntry {
  return {
    slot,
    player_id: player.id,
    is_starter: STARTER_SLOTS.includes(slot as (typeof STARTER_SLOTS)[number]),
    is_captain: existing?.is_captain ?? false,
    is_vice_captain: existing?.is_vice_captain ?? false,
    professional_players: player,
  };
}

function getLineupError(lineup: FantasyLineupEntry[]): string | null {
  if (STARTER_SLOTS.some((slot) => !lineup.some((entry) => entry.slot === slot))) {
    return 'Assign an eligible player to each of the five starting roles.';
  }
  if (new Set(lineup.map((entry) => entry.slot)).size !== lineup.length) {
    return 'Each lineup slot can only contain one player.';
  }
  if (new Set(lineup.map((entry) => entry.player_id)).size !== lineup.length) {
    return 'A player can only be assigned to one lineup slot.';
  }

  const starters = lineup.filter((entry) => STARTER_SLOTS.includes(entry.slot as (typeof STARTER_SLOTS)[number]));
  const captains = starters.filter((entry) => entry.is_captain);
  const viceCaptains = starters.filter((entry) => entry.is_vice_captain);
  if (captains.length !== 1 || viceCaptains.length !== 1 || captains[0].player_id === viceCaptains[0].player_id) {
    return 'Choose one different captain and vice-captain from your starting five.';
  }
  return null;
}

function formatTimeUntilDeadline(deadline: string): string {
  const deadlineTime = new Date(deadline).getTime();
  if (!Number.isFinite(deadlineTime)) return 'soon';
  const minutesRemaining = Math.max(0, Math.ceil((deadlineTime - Date.now()) / 60_000));
  const hours = Math.floor(minutesRemaining / 60);
  const minutes = minutesRemaining % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function lineupSlotColors(slot: LineupSlot): string {
  switch (slot) {
    case 'carry':
    case 'bench_1':
      return 'border-amber-700/50 bg-amber-950/25';
    case 'mid':
    case 'bench_2':
      return 'border-cyan-700/50 bg-cyan-950/25';
    case 'offlane':
      return 'border-emerald-700/50 bg-emerald-950/25';
    case 'support':
      return 'border-sky-700/50 bg-sky-950/25';
    case 'hard_support':
    case 'bench_3':
      return 'border-brand-600/50 bg-brand-500/10';
  }
}

function formatFixtureDate(value: string): string {
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

interface LineupFixtureDetailsProps {
  player: FantasyPlayer;
  fixturesByTeam: Map<number, TeamFixture[]>;
  difficultyByTeam: Record<number, FixtureDifficultyResult> | undefined;
  loading: boolean;
  failed: boolean;
  difficultyLoading: boolean;
  difficultyFailed: boolean;
  hasGameweek: boolean;
}

function LineupFixtureDetails({
  player,
  fixturesByTeam,
  difficultyByTeam,
  loading,
  failed,
  difficultyLoading,
  difficultyFailed,
  hasGameweek,
}: LineupFixtureDetailsProps) {
  const teamId = player.professional_teams?.id;
  if (teamId === undefined) {
    return <Text className="mt-2 text-xs text-slate-400">No team schedule available.</Text>;
  }
  if (loading) {
    return <Text accessibilityLiveRegion="polite" className="mt-2 text-xs text-slate-400">Loading selected-gameweek fixtures...</Text>;
  }
  if (failed) {
    return <Text accessibilityRole="alert" className="mt-2 text-xs text-amber-300">Unable to load fixtures for this team.</Text>;
  }
  if (!hasGameweek) {
    return <Text className="mt-2 text-xs text-slate-400">Select a gameweek to view fixtures.</Text>;
  }

  const fixtures = fixturesByTeam.get(teamId) ?? [];
  if (fixtures.length === 0) {
    return <Text className="mt-2 text-xs text-slate-400">No scheduled fixture in this gameweek.</Text>;
  }

  return (
    <View className="mt-3 gap-2 border-t border-slate-700/70 pt-3">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Selected gameweek fixtures
      </Text>
      {fixtures.map((fixture) => {
        const isTeamA = fixture.team_a_id === teamId;
        const opponentId = isTeamA ? fixture.team_b_id : fixture.team_a_id;
        const opponentName = isTeamA ? fixture.team_b?.name : fixture.team_a?.name;
        return (
          <View key={fixture.id} className="flex-row flex-wrap items-center justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-xs font-medium text-slate-200">
                vs {opponentName ?? 'Opponent TBA'}
              </Text>
              <Text className="mt-1 text-[11px] text-slate-500">{formatFixtureDate(fixture.scheduled_time)}</Text>
              {fixture.tournament_name ? (
                <Text numberOfLines={1} className="mt-0.5 text-[11px] text-slate-500">{fixture.tournament_name}</Text>
              ) : null}
            </View>
            {opponentId === null ? (
              <Text className="text-[11px] text-slate-400">Difficulty unavailable until opponent is confirmed.</Text>
            ) : difficultyLoading ? (
              <Text accessibilityLiveRegion="polite" className="text-[11px] text-slate-400">Loading difficulty...</Text>
            ) : difficultyFailed ? (
              <Text className="text-[11px] text-amber-300">Difficulty unavailable.</Text>
            ) : (
              <FixtureDifficultyBadge difficulty={difficultyByTeam?.[opponentId]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

interface LineupEditorProps {
  context: FantasyContext;
  userId: string;
}

export function LineupEditor({ context, userId }: LineupEditorProps) {
  const queryClient = useQueryClient();
  const { confirm, notify } = useMobileFeedback();
  const { colors, theme } = useMobileTheme();
  const lineupIconTint = theme === 'dark' ? '#22d3ee' : '#0e7490';
  const [lineup, setLineup] = useState<FantasyLineupEntry[]>(context.lineup);
  const [dirty, setDirty] = useState(false);
  const [activeSlot, setActiveSlot] = useState<LineupSlot | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const entriesBySlot = useMemo(
    () => new Map(lineup.map((entry) => [entry.slot as LineupSlot, entry])),
    [lineup]
  );
  const playersById = useMemo(
    () => new Map(context.ownedPlayers.map((player) => [player.id, player])),
    [context.ownedPlayers]
  );
  const teamIds = useMemo(
    () => [...new Set(context.ownedPlayers
      .map((player) => player.professional_teams?.id)
      .filter((teamId): teamId is number => teamId !== undefined))].sort((a, b) => a - b),
    [context.ownedPlayers]
  );
  const fixtureQuery = useQuery({
    queryKey: ['lineup-fixtures', userId, context.gameweek?.id, teamIds],
    queryFn: () => getUpcomingFixturesForTeams(teamIds, context.gameweek?.id),
    enabled: Boolean(context.gameweek?.id && teamIds.length > 0),
    staleTime: 60_000,
  });
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
  }, [fixtureQuery.data?.fixtures]);
  const opponentTeamIds = useMemo(() => {
    const squadTeamIds = new Set(teamIds);
    return [...new Set((fixtureQuery.data?.fixtures ?? []).flatMap((fixture) => {
      const opponentIds: number[] = [];
      if (fixture.team_a_id !== null && squadTeamIds.has(fixture.team_a_id) && fixture.team_b_id !== null) {
        opponentIds.push(fixture.team_b_id);
      }
      if (fixture.team_b_id !== null && squadTeamIds.has(fixture.team_b_id) && fixture.team_a_id !== null) {
        opponentIds.push(fixture.team_a_id);
      }
      return opponentIds;
    }))].sort((a, b) => a - b);
  }, [fixtureQuery.data?.fixtures, teamIds]);
  const fixtureDifficultyQuery = useQuery({
    queryKey: ['fixture-difficulty', userId, opponentTeamIds],
    queryFn: () => getFixtureDifficultyForTeams(opponentTeamIds),
    enabled: opponentTeamIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: saveLineup,
    onSuccess: () => {
      notify('Lineup saved', 'Your gameweek lineup has been updated.');
      void queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] });
    },
    onError: (error) => {
      setSaveError(error instanceof Error ? error.message : 'Lineup could not be saved. Please try again.');
    },
  });

  const isLocked = context.gameweek?.isLocked ?? true;
  const lineupError = getLineupError(lineup);
  const currentSlotEntry = activeSlot ? entriesBySlot.get(activeSlot) : undefined;
  const eligiblePlayers = activeSlot
    ? context.ownedPlayers.filter((player) => isEligibleForSlot(player, activeSlot))
    : [];

  function assignPlayer(slot: LineupSlot, player: FantasyPlayer) {
    const existingEntry = lineup.find((entry) => entry.player_id === player.id);
    mutation.reset();
    setLineup((current) => [
      ...current.filter((entry) => entry.slot !== slot && entry.player_id !== player.id),
      makeLineupEntry(slot, player, existingEntry),
    ]);
    setDirty(true);
    setSaveError(null);
    setActiveSlot(null);
  }

  function clearSlot(slot: LineupSlot) {
    mutation.reset();
    setLineup((current) => current.filter((entry) => entry.slot !== slot));
    setDirty(true);
    setSaveError(null);
    setActiveSlot(null);
  }

  function setCaptain(playerId: number, isViceCaptain: boolean) {
    mutation.reset();
    setLineup((current) => {
      const captainId = current.find((entry) => entry.is_captain)?.player_id;
      const viceCaptainId = current.find((entry) => entry.is_vice_captain)?.player_id;
      const nextCaptainId = isViceCaptain
        ? playerId === captainId ? viceCaptainId : captainId
        : playerId;
      const nextViceCaptainId = isViceCaptain
        ? playerId
        : playerId === captainId ? viceCaptainId : captainId;

      return current.map((entry) => ({
        ...entry,
        is_captain: entry.player_id === nextCaptainId,
        is_vice_captain: entry.player_id === nextViceCaptainId,
      }));
    });
    setDirty(true);
    setSaveError(null);
  }

  function submitLineup(confirmedNearDeadline = false) {
    if (isLocked || mutation.isPending || !context.gameweek || !context.fantasySeasonId) return;
    if (lineupError) {
      setSaveError(lineupError);
      return;
    }

    const deadline = context.gameweek.deadline;
    if (deadline) {
      const timeUntilDeadline = new Date(deadline).getTime() - Date.now();
      if (Number.isFinite(timeUntilDeadline) && timeUntilDeadline <= 0) {
        setSaveError('The gameweek deadline has passed. Refresh your team to check the locked lineup.');
        notify('Deadline passed', 'This gameweek is now locked. Refresh your team to see the latest lineup status.', 'error');
        void queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] });
        return;
      }
      if (
        Number.isFinite(timeUntilDeadline) &&
        timeUntilDeadline <= 2 * 60 * 60 * 1000 &&
        !confirmedNearDeadline
      ) {
        void confirm({
          title: 'Deadline approaching',
          message: `Deadline is in ${formatTimeUntilDeadline(deadline)} for Gameweek ${context.gameweek.gameweekNumber}. Are you sure you want to save these lineup changes?`,
          cancelLabel: 'Keep editing',
          confirmLabel: 'Save lineup',
        }).then((confirmed) => {
          if (confirmed) submitLineup(true);
        });
        return;
      }
    }

    mutation.mutate({
      fantasySeasonId: context.fantasySeasonId,
      gameweekId: context.gameweek.id,
      lineup: lineup.map((entry) => ({
        playerId: entry.player_id,
        slot: entry.slot,
        isCaptain: entry.is_captain,
        isViceCaptain: entry.is_vice_captain,
      })),
    });
  }

  return (
    <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
          <SymbolView
            name={{ ios: 'list.bullet.rectangle.portrait', android: 'format_list_numbered', web: 'format_list_numbered' }}
            size={20}
            tintColor={lineupIconTint}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-bold text-slate-50">Gameweek lineup</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            {context.gameweek
              ? `Gameweek ${context.gameweek.gameweekNumber}${context.gameweek.deadline ? ` · Deadline ${new Date(context.gameweek.deadline).toLocaleString()}` : ''}`
              : 'No gameweek is available.'}
          </Text>
        </View>
      </View>

      {isLocked ? (
        <View accessibilityRole="alert" className="gap-1 rounded-xl border border-red-700/60 bg-red-950/70 p-4">
          <Text className="text-sm font-bold text-red-100">
            Lineup locked for Gameweek {context.gameweek?.gameweekNumber ?? '—'}
          </Text>
          <Text className="text-xs leading-5 text-red-200/80">
            The deadline has passed. Your saved lineup is read-only and can no longer be changed.
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        {ALL_SLOTS.map((slot) => {
          const entry = entriesBySlot.get(slot);
          const player = entry ? playersById.get(entry.player_id) ?? entry.professional_players : null;
          const isStarter = STARTER_SLOTS.includes(slot as (typeof STARTER_SLOTS)[number]);

          return (
            <View key={slot} className={`rounded-xl border p-3 ${lineupSlotColors(slot)}`}>
              <View className="flex-row items-center justify-between gap-2">
            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-500/40 bg-slate-900">
              {player?.profile_image_url ? (
                <Image
                  accessibilityLabel={`${player.in_game_name || player.name} avatar`}
                  source={{ uri: player.profile_image_url }}
                  className="h-11 w-11"
                />
              ) : (
                <Text className="text-sm font-bold text-slate-300">
                  {(player?.in_game_name || player?.name || SLOT_LABELS[slot]).slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
            <View className="min-w-0 flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                    {SLOT_LABELS[slot]}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap items-center gap-2">
                    <Text className="text-sm font-semibold text-slate-50">
                      {player?.in_game_name || player?.name || 'No player selected'}
                    </Text>
                    {entry?.is_captain ? (
                      <Text
                        accessibilityLabel="Captain"
                        className="rounded-full border border-amber-400/70 bg-amber-400 px-2 py-0.5 text-xs font-black text-slate-950"
                      >
                        C
                      </Text>
                    ) : null}
                    {entry?.is_vice_captain ? (
                      <Text
                        accessibilityLabel="Vice-captain"
                        className="rounded-full border border-cyan-400/70 bg-cyan-400 px-2 py-0.5 text-xs font-black text-slate-950"
                      >
                        VC
                      </Text>
                    ) : null}
                  </View>
                  {player ? (
                    <Text className="mt-1 text-xs text-slate-400">
                      {player.primary_role ?? 'Role unavailable'} · {player.current_price.toFixed(1)}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${player ? 'Change' : 'Choose'} ${SLOT_LABELS[slot]} player`}
                  accessibilityState={{ disabled: isLocked || mutation.isPending }}
                  className={`min-h-11 min-w-16 items-center justify-center rounded-lg border border-slate-700 px-3 ${
                    isLocked || mutation.isPending ? 'opacity-50' : 'active:bg-slate-800'
                  }`}
                  disabled={isLocked || mutation.isPending}
                  onPress={() => setActiveSlot(slot)}
                >
                  <Text className="text-sm font-semibold text-slate-50">{player ? 'Change' : 'Choose'}</Text>
                </Pressable>
              </View>
              {player && isStarter ? (
                <View className="mt-3 flex-row gap-2">
                  <ToggleButton
                    active={Boolean(entry?.is_captain)}
                    disabled={isLocked || mutation.isPending}
                    label="Captain"
                    onPress={() => setCaptain(player.id, false)}
                  />
                  <ToggleButton
                    active={Boolean(entry?.is_vice_captain)}
                    disabled={isLocked || mutation.isPending}
                    label="Vice-captain"
                    onPress={() => setCaptain(player.id, true)}
                  />
                </View>
              ) : null}
              {player ? (
                <LineupFixtureDetails
                  player={player}
                  fixturesByTeam={fixturesByTeam}
                  difficultyByTeam={fixtureDifficultyQuery.data}
                  loading={Boolean(context.gameweek?.id && fixtureQuery.isPending)}
                  failed={fixtureQuery.isError
                    || (fixtureQuery.data?.failedTeamIds.includes(player.professional_teams?.id ?? -1) ?? false)}
                  difficultyLoading={fixtureDifficultyQuery.isPending}
                  difficultyFailed={fixtureDifficultyQuery.isError}
                  hasGameweek={Boolean(context.gameweek?.id)}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {fixtureQuery.isError ? (
        <View className="gap-2 rounded-xl border border-red-800/60 bg-red-950/30 p-3">
          <Text accessibilityRole="alert" className="text-sm leading-5 text-red-200">
            {fixtureQuery.error instanceof Error ? fixtureQuery.error.message : 'Unable to load selected-gameweek fixtures.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: fixtureQuery.isFetching }}
            disabled={fixtureQuery.isFetching}
            onPress={() => void fixtureQuery.refetch()}
          >
            <Text className="font-semibold text-white">{fixtureQuery.isFetching ? 'Retrying fixtures...' : 'Retry fixtures'}</Text>
          </Pressable>
        </View>
      ) : null}
      {fixtureQuery.data?.failedTeamIds.length ? (
        <View className="gap-2 rounded-xl border border-amber-700/60 bg-amber-950/20 p-3">
          <Text className="text-sm leading-5 text-amber-200">
            Fixtures could not be loaded for team IDs {fixtureQuery.data.failedTeamIds.join(', ')}. Available fixtures are still shown.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: fixtureQuery.isFetching }}
            disabled={fixtureQuery.isFetching}
            onPress={() => void fixtureQuery.refetch()}
          >
            <Text className="font-semibold text-white">{fixtureQuery.isFetching ? 'Retrying fixtures...' : 'Retry fixtures'}</Text>
          </Pressable>
        </View>
      ) : null}
      {fixtureDifficultyQuery.isError ? (
        <View className="gap-2 rounded-xl border border-amber-700/60 bg-amber-950/20 p-3">
          <Text accessibilityRole="alert" className="text-sm leading-5 text-amber-200">
            {fixtureDifficultyQuery.error instanceof Error
              ? fixtureDifficultyQuery.error.message
              : 'Unable to load fixture difficulty.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: fixtureDifficultyQuery.isFetching }}
            disabled={fixtureDifficultyQuery.isFetching}
            onPress={() => void fixtureDifficultyQuery.refetch()}
          >
            <Text className="font-semibold text-white">
              {fixtureDifficultyQuery.isFetching ? 'Retrying difficulty...' : 'Retry difficulty'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {lineupError ? <Text className="text-sm leading-5 text-amber-200">{lineupError}</Text> : null}
      {saveError ? <Text accessibilityRole="alert" className="text-sm leading-5 text-red-300">{saveError}</Text> : null}
      {mutation.isSuccess ? (
        <Text accessibilityRole="text" className="text-sm font-medium text-emerald-300">Lineup saved successfully.</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{         disabled: isLocked || mutation.isPending || mutation.isSuccess || !dirty || Boolean(lineupError), busy: mutation.isPending }}
        className={`min-h-12 items-center justify-center rounded-xl bg-brand-500 px-4 ${
          isLocked || mutation.isPending || mutation.isSuccess || !dirty || Boolean(lineupError) ? 'opacity-50' : 'active:opacity-80'
        }`}
        disabled={isLocked || mutation.isPending || mutation.isSuccess || !dirty || Boolean(lineupError)}
        onPress={() => submitLineup()}
      >
        {mutation.isPending ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color={colors.onAccent} />
            <Text className="font-bold text-white">Saving lineup</Text>
          </View>
        ) : (
          <Text className="font-bold text-white">Save lineup</Text>
        )}
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setActiveSlot(null)}
        transparent
        visible={activeSlot !== null}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[80%] rounded-t-3xl border border-slate-700 bg-slate-950 px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text accessibilityRole="header" className="text-xl font-bold text-white">
                  Choose {activeSlot ? SLOT_LABELS[activeSlot] : 'player'}
                </Text>
                <Text className="mt-1 text-sm text-slate-400">
                  {eligiblePlayers.length} eligible squad {eligiblePlayers.length === 1 ? 'player' : 'players'}
                </Text>
              </View>
              <Pressable accessibilityRole="button" className="min-h-11 justify-center px-2" onPress={() => setActiveSlot(null)}>
                <Text className="font-semibold text-brand-400">Close</Text>
              </Pressable>
            </View>
            <ScrollView className="shrink" contentContainerClassName="gap-2">
              {eligiblePlayers.map((player) => {
                const isSelected = currentSlotEntry?.player_id === player.id;
                const assignedSlot = lineup.find((entry) => entry.player_id === player.id)?.slot;
                return (
                  <Pressable
                    key={player.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={`min-h-16 flex-row items-center gap-3 rounded-xl border px-3 ${
                      isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-900'
                    }`}
                    onPress={() => {
                      if (activeSlot) assignPlayer(activeSlot, player);
                    }}
                  >
                    <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-500/40 bg-slate-800">
                      {player.profile_image_url ? (
                        <Image
                          accessibilityLabel={`${player.in_game_name || player.name} avatar`}
                          source={{ uri: player.profile_image_url }}
                          className="h-10 w-10"
                        />
                      ) : (
                        <Text className="text-sm font-bold text-slate-300">
                          {(player.in_game_name || player.name).slice(0, 1).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="font-semibold text-white">{player.in_game_name || player.name}</Text>
                      <Text className="mt-1 text-xs text-slate-400">
                        {player.primary_role ?? 'Role unavailable'} · {player.current_price.toFixed(1)}
                        {assignedSlot && assignedSlot !== activeSlot ? ` · Currently ${SLOT_LABELS[assignedSlot as LineupSlot] ?? assignedSlot}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {eligiblePlayers.length === 0 ? (
                <Text className="py-8 text-center text-sm leading-5 text-slate-400">
                  No eligible owned players are available for this slot.
                </Text>
              ) : null}
            </ScrollView>
            {currentSlotEntry && activeSlot ? (
              <Pressable
                accessibilityRole="button"
                className="mt-3 min-h-12 items-center justify-center rounded-xl border border-slate-700"
                onPress={() => clearSlot(activeSlot)}
              >
                <Text className="font-semibold text-red-300">Clear slot</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToggleButton({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      className={`min-h-10 flex-1 items-center justify-center rounded-lg border px-2 ${
        active ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700'
      } ${disabled ? 'opacity-50' : 'active:bg-slate-800'}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className={`text-xs font-semibold ${active ? 'text-brand-400' : 'text-slate-300'}`}>
        {active ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}
