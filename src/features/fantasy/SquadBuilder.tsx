import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { FantasyContext, FantasyPlayer, MarketPlayer } from './api';
import { addPlayersToSquad, getPlayerMarket } from './api';
import { PriceSparkline } from '@/src/components/PriceSparkline';
import { useMobileTheme } from '@/src/lib/theme';
import { getOwnershipPresentation } from '@/src/lib/ownership';

const SQUAD_MAX_SIZE = 8;

interface SquadBuilderProps {
  context: FantasyContext;
  userId: string;
  quickAddPlayerId?: number;
  quickAddPlayerName?: string;
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

export function SquadBuilder({
  context,
  userId,
  quickAddPlayerId,
  quickAddPlayerName,
}: SquadBuilderProps) {
  const queryClient = useQueryClient();
  const { colors } = useMobileTheme();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [manuallySelectedPlayers, setManuallySelectedPlayers] = useState<Map<number, MarketPlayer>>(new Map());
  const [dismissedQuickAddId, setDismissedQuickAddId] = useState<number | null>(null);
  const deferredSearch = useDeferredValue(search);
  const remainingSlots = Math.max(0, SQUAD_MAX_SIZE - context.ownedPlayers.length);
  const quickAddQuery = useQuery({
    queryKey: ['player-market-quick-add', quickAddPlayerId, quickAddPlayerName],
    queryFn: () => getPlayerMarket(quickAddPlayerName ?? ''),
    enabled: Boolean(quickAddPlayerId && quickAddPlayerName),
    staleTime: 60_000,
  });
  const quickAddPlayer = quickAddQuery.data?.find((player) => player.id === quickAddPlayerId) ?? null;
  const manualSelectionCost = [...manuallySelectedPlayers.values()].reduce(
    (total, player) => total + (player.current_price ?? 0),
    0
  );
  const quickAddWouldCompleteSquad = Boolean(
    quickAddPlayer && context.ownedPlayers.length + manuallySelectedPlayers.size + 1 === SQUAD_MAX_SIZE
  );
  const quickAddFitsSquad = Boolean(
    quickAddPlayer &&
    quickAddPlayer.availability_status === 'available' &&
    !context.ownedPlayers.some((player) => player.id === quickAddPlayer.id) &&
    manuallySelectedPlayers.size < remainingSlots &&
    quickAddPlayer.current_price !== null &&
    manualSelectionCost + quickAddPlayer.current_price <= context.budget &&
    (!quickAddWouldCompleteSquad ||
      canFillStarterRoles([...context.ownedPlayers, ...manuallySelectedPlayers.values(), quickAddPlayer]))
  );
  const quickAddIsSelected = Boolean(
    quickAddFitsSquad && quickAddPlayerId !== dismissedQuickAddId
  );
  const selectedPlayers = new Map(manuallySelectedPlayers);
  if (quickAddIsSelected && quickAddPlayer) selectedPlayers.set(quickAddPlayer.id, quickAddPlayer);
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
      setManuallySelectedPlayers(new Map());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] }),
        queryClient.invalidateQueries({ queryKey: ['transfer-history-analytics', userId] }),
      ]);
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
  const visiblePlayers = [
    ...(quickAddPlayer ? [quickAddPlayer] : []),
    ...availablePlayers.filter((player) =>
      player.id !== quickAddPlayer?.id &&
      (roleFilter === 'all' || player.primary_role?.trim().toLowerCase().replaceAll(' ', '_') === roleFilter)
    ),
  ];

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

      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Filter by role</Text>
        <View className="flex-row flex-wrap gap-2">
          {(['all', 'carry', 'mid', 'offlane', 'support', 'hard_support'] as const).map((role) => (
            <Pressable
              key={role}
              accessibilityRole="button"
              accessibilityState={{ selected: roleFilter === role }}
              className={`min-h-9 justify-center rounded-full border px-3 ${
                roleFilter === role ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-950'
              }`}
              onPress={() => setRoleFilter(role)}
            >
              <Text className={`text-xs font-medium ${roleFilter === role ? 'text-brand-300' : 'text-slate-400'}`}>
                {role === 'all' ? 'All roles' : role.replaceAll('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

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
          {quickAddQuery.isError ? (
            <Text accessibilityRole="alert" className="text-sm text-red-300">
              {quickAddQuery.error instanceof Error ? quickAddQuery.error.message : 'Unable to load the selected player.'}
            </Text>
          ) : null}
          {quickAddPlayer && !quickAddFitsSquad ? (
            <Text className="text-sm leading-5 text-amber-200">
              {quickAddPlayer.availability_status !== 'available'
                ? 'The selected player is unavailable.'
                : quickAddPlayer.current_price === null
                  ? 'The selected player has no current price.'
                  : quickAddPlayer.current_price + manualSelectionCost > context.budget
                    ? 'The selected player is over your remaining budget.'
                    : 'The selected player does not fit the remaining squad slots or role requirements.'}
            </Text>
          ) : null}
          {visiblePlayers
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
                player.availability_status !== 'available' ||
                context.ownedPlayers.some((owned) => owned.id === player.id) ||
                player.current_price === null ||
                exceedsBudget ||
                invalidFinalRoles
              );
              const ownership = getOwnershipPresentation(player.ownership_percentage);
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
                    if (player.id === quickAddPlayerId && quickAddPlayer) {
                      setDismissedQuickAddId(isSelected ? quickAddPlayer.id : null);
                      return;
                    }
                    setManuallySelectedPlayers((current) => {
                      const next = new Map(current);
                      if (next.has(player.id)) next.delete(player.id);
                      else next.set(player.id, player);
                      return next;
                    });
                  }}
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-semibold text-white" numberOfLines={1}>{playerName(player)}</Text>
                    {player.ownership_percentage != null ? (
                      <Text className={`rounded-full px-2 py-1 text-[10px] font-semibold ${ownership.badgeBg} ${ownership.badgeText}`}>
                        {player.ownership_percentage.toFixed(1)}% owned
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? <Text className="mt-1 text-xs font-semibold text-brand-300">Selected for your squad</Text> : null}
                  <Text className="mt-1 text-xs text-slate-400">
                    {player.primary_role ?? 'Role unavailable'} ·{' '}
                    {player.current_price === null ? 'Price unavailable' : `${player.current_price.toFixed(1)}M`}
                    {player.recent_points === null ? '' : ` · Recent ${player.recent_points} pts`}
                  </Text>
                  {player.price_history?.length ? (
                    <View className="mt-1 self-start">
                      <PriceSparkline data={player.price_history} width={72} height={20} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          {visiblePlayers.length === 0 ? (
            <Text className="py-3 text-sm text-slate-400">
              {availablePlayers.length ? 'No available players match this role filter.' : 'No available players found.'}
            </Text>
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
