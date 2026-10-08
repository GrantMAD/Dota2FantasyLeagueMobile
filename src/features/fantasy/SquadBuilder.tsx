import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { FantasyContext, FantasyPlayer, MarketPlayer } from './api';
import { addPlayersToSquad, getPlayerMarket } from './api';
import { useMobileTheme } from '@/src/lib/theme';

const SQUAD_MAX_SIZE = 8;

interface SquadBuilderProps {
  context: FantasyContext;
  userId: string;
}

function playerName(player: MarketPlayer): string {
  return player.in_game_name || player.name;
}

function canFillStarterRoles(players: (FantasyPlayer | MarketPlayer)[]): boolean {
  const roleCounts = new Map<string, number>();
  for (const player of players) {
    const role = player.primary_role?.trim().toLowerCase().replaceAll(' ', '_');
    if (role) roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  return (
    (roleCounts.get('carry') ?? 0) >= 1 &&
    (roleCounts.get('mid') ?? 0) >= 1 &&
    (roleCounts.get('offlane') ?? 0) >= 1 &&
    (roleCounts.get('support') ?? 0) + (roleCounts.get('hard_support') ?? 0) >= 2
  );
}

export function SquadBuilder({ context, userId }: SquadBuilderProps) {
  const queryClient = useQueryClient();
  const { colors } = useMobileTheme();
  const [search, setSearch] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Map<number, MarketPlayer>>(new Map());
  const deferredSearch = useDeferredValue(search);
  const remainingSlots = Math.max(0, SQUAD_MAX_SIZE - context.ownedPlayers.length);
  const selectionCost = [...selectedPlayers.values()].reduce(
    (total, player) => total + (player.current_price ?? 0),
    0
  );
  const canAddPlayers = Boolean(
    context.fantasySeasonId &&
    selectedPlayers.size > 0 &&
    selectedPlayers.size <= remainingSlots &&
    selectionCost <= context.budget &&
    [...selectedPlayers.values()].every((player) => player.current_price !== null)
  );

  const marketQuery = useQuery({
    queryKey: ['player-market', deferredSearch],
    queryFn: () => getPlayerMarket(deferredSearch),
    enabled: remainingSlots > 0,
    staleTime: 60_000,
  });
  const addMutation = useMutation({
    mutationFn: addPlayersToSquad,
    onSuccess: async (result) => {
      setSelectedPlayers(new Map());
      await queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] });
      Alert.alert(
        'Squad updated',
        `Added players to your squad. ${result.squadSize}/${result.squadMaxSize} players selected.`
      );
    },
  });
  const availablePlayers = (marketQuery.data ?? []).filter((player) =>
    !context.ownedPlayers.some((owned) => owned.id === player.id) &&
    player.availability_status === 'available'
  );

  function confirmAddPlayers() {
    if (!canAddPlayers || !context.fantasySeasonId) return;
    const playerIds = [...selectedPlayers.keys()];
    Alert.alert(
      'Confirm squad selection',
      `Add ${playerIds.length} player${playerIds.length === 1 ? '' : 's'} for ${selectionCost.toFixed(1)}M? The server will confirm your available budget.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add players',
          onPress: () => addMutation.mutate({ fantasySeasonId: context.fantasySeasonId!, playerIds }),
        },
      ]
    );
  }

  return (
    <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <View>
        <Text className="text-lg font-bold text-white">
          {context.ownedPlayers.length === 0 ? 'Build your squad' : 'Complete your squad'}
        </Text>
        <Text className="mt-1 text-sm leading-5 text-slate-400">
          Select up to {remainingSlots} more players. Your current budget is {context.budget.toFixed(1)}M.
        </Text>
      </View>

      <TextInput
        accessibilityLabel="Search players to add to your squad"
        autoCapitalize="none"
        autoCorrect={false}
        className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white"
        editable={!addMutation.isPending}
        onChangeText={setSearch}
        placeholder="Search available players"
        placeholderTextColor={colors.placeholder}
        value={search}
      />

      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-slate-300">
          Selected {selectedPlayers.size} · {selectionCost.toFixed(1)}M
        </Text>
        <Text className="text-sm text-slate-400">
          Squad {context.ownedPlayers.length + selectedPlayers.size}/{SQUAD_MAX_SIZE}
        </Text>
      </View>

      {marketQuery.isPending ? (
        <ActivityIndicator accessibilityLabel="Loading available players" color="#14b8a6" />
      ) : marketQuery.isError ? (
        <View accessibilityRole="alert" className="gap-2">
          <Text className="text-sm text-red-300">
            {marketQuery.error instanceof Error ? marketQuery.error.message : 'Player market unavailable.'}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void marketQuery.refetch()}>
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-2">
          {availablePlayers
            .slice(0, 12)
            .map((player) => {
              const isSelected = selectedPlayers.has(player.id);
              const addedCost = player.current_price ?? 0;
              const exceedsBudget = selectionCost + addedCost > context.budget;
              const wouldCompleteSquad = !isSelected &&
                context.ownedPlayers.length + selectedPlayers.size + 1 === SQUAD_MAX_SIZE;
              const invalidFinalRoles = wouldCompleteSquad &&
                !canFillStarterRoles([...context.ownedPlayers, ...selectedPlayers.values(), player]);
              const cannotSelect = !isSelected && (
                selectedPlayers.size >= remainingSlots ||
                player.current_price === null ||
                exceedsBudget ||
                invalidFinalRoles
              );
              return (
                <Pressable
                  key={player.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: cannotSelect || addMutation.isPending }}
                  className={`min-h-14 justify-center rounded-xl border px-3 ${
                    isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-950'
                  }`}
                  disabled={cannotSelect || addMutation.isPending}
                  onPress={() => {
                    addMutation.reset();
                    setSelectedPlayers((current) => {
                      const next = new Map(current);
                      if (next.has(player.id)) next.delete(player.id);
                      else next.set(player.id, player);
                      return next;
                    });
                  }}
                >
                  <Text className="font-semibold text-white">{playerName(player)}</Text>
                  <Text className="mt-1 text-xs text-slate-400">
                    {player.primary_role ?? 'Role unavailable'} ·{' '}
                    {player.current_price === null ? 'Price unavailable' : `${player.current_price.toFixed(1)}M`}
                    {player.recent_points === null ? '' : ` · Recent ${player.recent_points} pts`}
                  </Text>
                </Pressable>
              );
            })}
          {availablePlayers.length === 0 ? (
            <Text className="py-3 text-sm text-slate-400">No available players found.</Text>
          ) : null}
        </View>
      )}

      {context.ownedPlayers.length + selectedPlayers.size === SQUAD_MAX_SIZE - 1 &&
      !canFillStarterRoles([...context.ownedPlayers, ...selectedPlayers.values()]) ? (
        <Text className="text-sm leading-5 text-amber-200">
          Your final player must complete the starter roles: Carry, Mid, Offlane, and two Support/Hard Support players.
        </Text>
      ) : null}
      {selectionCost > context.budget ? (
        <Text accessibilityRole="alert" className="text-sm text-red-300">
          Your selection exceeds the available budget.
        </Text>
      ) : null}
      {addMutation.isError ? (
        <Text accessibilityRole="alert" className="text-sm text-red-300">
          {addMutation.error instanceof Error ? addMutation.error.message : 'Squad update failed.'}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        className={`min-h-12 items-center justify-center rounded-xl ${
          canAddPlayers && !addMutation.isPending ? 'bg-brand-500' : 'bg-slate-700'
        }`}
        disabled={!canAddPlayers || addMutation.isPending}
        onPress={confirmAddPlayers}
      >
        {addMutation.isPending ? (
          <ActivityIndicator accessibilityLabel="Adding players" color={colors.onAccent} />
        ) : (
          <Text className="font-semibold text-white">Add selected players</Text>
        )}
      </Pressable>
    </View>
  );
}
