import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { FantasyContext, FantasyLineupEntry, FantasyPlayer } from './api';
import { saveLineup } from './api';
import { useMobileTheme } from '@/src/lib/theme';

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

interface LineupEditorProps {
  context: FantasyContext;
  userId: string;
}

export function LineupEditor({ context, userId }: LineupEditorProps) {
  const queryClient = useQueryClient();
  const { colors } = useMobileTheme();
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

  const mutation = useMutation({
    mutationFn: saveLineup,
    onSuccess: async () => {
      Alert.alert('Lineup saved', 'Your gameweek lineup has been updated.');
      await queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] });
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

  function submitLineup() {
    if (isLocked || mutation.isPending || !context.gameweek || !context.fantasySeasonId) return;
    if (lineupError) {
      setSaveError(lineupError);
      return;
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
      <View>
        <Text className="text-lg font-bold text-white">Gameweek lineup</Text>
        <Text className="mt-1 text-sm text-slate-400">
          {context.gameweek
            ? `Gameweek ${context.gameweek.gameweekNumber}${context.gameweek.deadline ? ` · Deadline ${new Date(context.gameweek.deadline).toLocaleString()}` : ''}`
            : 'No gameweek is available.'}
        </Text>
      </View>

      {isLocked ? (
        <View accessibilityRole="alert" className="rounded-xl border border-amber-800 bg-amber-950 p-3">
          <Text className="text-sm font-medium text-amber-100">This gameweek is locked. Lineup changes are unavailable.</Text>
        </View>
      ) : null}

      <View className="gap-2">
        {ALL_SLOTS.map((slot) => {
          const entry = entriesBySlot.get(slot);
          const player = entry ? playersById.get(entry.player_id) ?? entry.professional_players : null;
          const isStarter = STARTER_SLOTS.includes(slot as (typeof STARTER_SLOTS)[number]);

          return (
            <View key={slot} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                    {SLOT_LABELS[slot]}
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-white">
                    {player?.in_game_name || player?.name || 'No player selected'}
                  </Text>
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
                  <Text className="text-sm font-semibold text-white">{player ? 'Change' : 'Choose'}</Text>
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
            </View>
          );
        })}
      </View>

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
        onPress={submitLineup}
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
                <Text className="text-xl font-bold text-white">
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
                    className={`min-h-16 justify-center rounded-xl border px-4 ${
                      isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-900'
                    }`}
                    onPress={() => {
                      if (activeSlot) assignPlayer(activeSlot, player);
                    }}
                  >
                    <Text className="font-semibold text-white">{player.in_game_name || player.name}</Text>
                    <Text className="mt-1 text-xs text-slate-400">
                      {player.primary_role ?? 'Role unavailable'} · {player.current_price.toFixed(1)}
                      {assignedSlot && assignedSlot !== activeSlot ? ` · Currently ${SLOT_LABELS[assignedSlot as LineupSlot] ?? assignedSlot}` : ''}
                    </Text>
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
