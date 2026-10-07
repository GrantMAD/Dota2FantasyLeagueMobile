import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { FantasyContext, FantasyPlayer, MarketPlayer } from './api';
import { getPlayerMarket, getTransferHistory, processTransfer } from './api';
import { useMobileTheme } from '@/src/lib/theme';

interface WildcardTransferBuilderProps {
  context: FantasyContext;
  userId: string;
}

interface TransferPair {
  playerOut: FantasyPlayer;
  playerIn: MarketPlayer;
}

function normalizeRole(role: string | null): string {
  return role?.trim().toLowerCase().replaceAll(' ', '_') ?? '';
}

function playerName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export function WildcardTransferBuilder({ context, userId }: WildcardTransferBuilderProps) {
  const queryClient = useQueryClient();
  const { colors } = useMobileTheme();
  const [search, setSearch] = useState('');
  const [selectedOutId, setSelectedOutId] = useState<number | null>(null);
  const [pairs, setPairs] = useState<TransferPair[]>([]);
  const deferredSearch = useDeferredValue(search);
  const pairedOutIds = new Set(pairs.map((pair) => pair.playerOut.id));
  const pairedInIds = new Set(pairs.map((pair) => pair.playerIn.id));
  const selectedOut = context.ownedPlayers.find((player) => player.id === selectedOutId) ?? null;

  const marketQuery = useQuery({
    queryKey: ['player-market', deferredSearch],
    queryFn: () => getPlayerMarket(deferredSearch),
    enabled: true,
    staleTime: 60_000,
  });
  const historyQuery = useQuery({
    queryKey: ['transfer-history', userId],
    queryFn: getTransferHistory,
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const transferMutation = useMutation({
    mutationFn: processTransfer,
    onSuccess: async (result) => {
      setPairs([]);
      setSelectedOutId(null);
      Alert.alert(
        'Wildcard transfers completed',
        `Your squad has been updated. Transfer-hit penalty: ${result.penaltyPoints} points.`
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] }),
        queryClient.invalidateQueries({ queryKey: ['transfer-history', userId] }),
      ]);
    },
  });

  const availableMarketPlayers = (marketQuery.data ?? []).filter((player) =>
    !context.ownedPlayers.some((owned) => owned.id === player.id) &&
    !pairedInIds.has(player.id) &&
    player.availability_status === 'available' &&
    player.current_price !== null &&
    Boolean(normalizeRole(player.primary_role)) &&
    (!selectedOut || normalizeRole(player.primary_role) === normalizeRole(selectedOut.primary_role))
  );
  const canSubmit = Boolean(
    context.fantasySeasonId &&
    context.ownedPlayers.length > 0 &&
    pairs.length > 0 &&
    !context.gameweek?.isLocked &&
    !transferMutation.isPending
  );

  function addPair(playerIn: MarketPlayer) {
    if (!selectedOut || transferMutation.isPending) return;
    setPairs((current) => [...current, { playerOut: selectedOut, playerIn }]);
    setSelectedOutId(null);
    transferMutation.reset();
  }

  function removePair(playerOutId: number) {
    setPairs((current) => current.filter((pair) => pair.playerOut.id !== playerOutId));
    transferMutation.reset();
  }

  function confirmTransfers() {
    if (!canSubmit || !context.fantasySeasonId) return;
    const transferCount = pairs.length;
    Alert.alert(
      'Confirm Wildcard transfers',
      `Complete ${transferCount} transfer${transferCount === 1 ? '' : 's'} using your active Wildcard? The server will validate roles, budget, squad limits, and the deadline.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm transfers',
          onPress: () => transferMutation.mutate({
            fantasySeasonId: context.fantasySeasonId!,
            transfersIn: pairs.map((pair) => pair.playerIn.id),
            transfersOut: pairs.map((pair) => pair.playerOut.id),
          }),
        },
      ]
    );
  }

  return (
    <View className="gap-4 rounded-2xl border border-amber-800/70 bg-slate-900 p-4">
      <View>
        <Text className="text-lg font-bold text-white">Wildcard transfer builder</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-400">
          Build multiple role-for-role swaps and submit them together. The server checks the final budget, roster limits, and deadline.
        </Text>
      </View>

      {context.gameweek?.isLocked ? (
        <View accessibilityRole="alert" className="rounded-xl border border-amber-800 bg-amber-950 p-3">
          <Text className="text-sm font-medium text-amber-100">Transfers are locked for this gameweek.</Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select players to sell</Text>
        {context.ownedPlayers.map((player) => {
          const selected = player.id === selectedOutId;
          const paired = pairedOutIds.has(player.id);
          return (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: paired || context.gameweek?.isLocked || transferMutation.isPending }}
              className={`min-h-14 justify-center rounded-xl border px-3 ${
                selected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950'
              } ${paired ? 'opacity-50' : ''}`}
              disabled={paired || context.gameweek?.isLocked || transferMutation.isPending}
              onPress={() => {
                setSelectedOutId(selected ? null : player.id);
                transferMutation.reset();
              }}
            >
              <Text className="font-semibold text-white">{playerName(player)}{paired ? ' · Selected' : ''}</Text>
              <Text className="mt-1 text-xs text-slate-400">{player.primary_role ?? 'Role unavailable'} · {player.current_price.toFixed(1)}M</Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Search replacement{selectedOut ? ` · ${selectedOut.primary_role ?? 'role unavailable'}` : ''}
        </Text>
        <TextInput
          accessibilityLabel="Search Wildcard replacement players"
          autoCapitalize="none"
          autoCorrect={false}
          className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white"
          editable={!context.gameweek?.isLocked && !transferMutation.isPending}
          onChangeText={setSearch}
          placeholder={selectedOut ? `Search ${selectedOut.primary_role ?? 'players'}` : 'Select a player to sell first'}
          placeholderTextColor={colors.placeholder}
          value={search}
        />
        {marketQuery.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading replacement players" color="#fb923c" />
        ) : marketQuery.isError ? (
          <Text accessibilityRole="alert" className="text-sm text-red-300">
            {marketQuery.error instanceof Error ? marketQuery.error.message : 'Player market unavailable.'}
          </Text>
        ) : availableMarketPlayers.length > 0 ? (
          availableMarketPlayers.slice(0, 12).map((player) => (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedOut || context.gameweek?.isLocked || transferMutation.isPending }}
              className="min-h-14 justify-center rounded-xl border border-slate-800 bg-slate-950 px-3"
              disabled={!selectedOut || context.gameweek?.isLocked || transferMutation.isPending}
              onPress={() => addPair(player)}
            >
              <Text className="font-semibold text-white">{playerName(player)}</Text>
              <Text className="mt-1 text-xs text-slate-400">
                {player.primary_role ?? 'Role unavailable'} · {player.current_price?.toFixed(1)}M
                {player.recent_points === null ? '' : ` · Recent ${player.recent_points} pts`}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text className="py-2 text-sm leading-5 text-slate-400">
            {selectedOut ? 'No available replacement matches this role and search.' : 'Select a player to sell to see eligible replacements.'}
          </Text>
        )}
      </View>

      {pairs.length > 0 ? (
        <View className="gap-2 border-t border-slate-800 pt-4">
          <Text className="text-sm font-semibold text-white">Planned transfers · {pairs.length}</Text>
          {pairs.map((pair) => (
            <View key={pair.playerOut.id} className="flex-row items-center justify-between gap-3 rounded-xl bg-slate-950 p-3">
              <View className="flex-1">
                <Text className="text-sm text-slate-200">
                  {playerName(pair.playerOut)} → {playerName(pair.playerIn)}
                </Text>
                <Text className="mt-1 text-xs text-slate-400">{pair.playerOut.primary_role}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => removePair(pair.playerOut.id)}>
                <Text className="px-2 py-2 text-sm font-semibold text-red-300">Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {transferMutation.error ? (
        <Text accessibilityRole="alert" className="text-sm leading-5 text-red-300">
          {transferMutation.error.message}
        </Text>
      ) : null}
      {transferMutation.isPending ? (
        <View className="flex-row items-center justify-center gap-2 py-2">
          <ActivityIndicator color="#fbbf24" />
          <Text className="text-sm text-slate-300">Processing Wildcard transfers</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          className={`min-h-12 items-center justify-center rounded-xl ${
            canSubmit ? 'bg-amber-600 active:opacity-80' : 'bg-slate-700 opacity-50'
          }`}
          disabled={!canSubmit}
          onPress={confirmTransfers}
        >
          <Text className="font-bold text-white">Review {pairs.length || ''} Wildcard transfer{pairs.length === 1 ? '' : 's'}</Text>
        </Pressable>
      )}

      <View className="border-t border-slate-800 pt-4">
        <Text className="text-base font-semibold text-white">Recent transfers</Text>
        {historyQuery.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading transfer history" className="mt-3" color="#fb923c" />
        ) : historyQuery.isError ? (
          <Text accessibilityRole="alert" className="mt-2 text-sm text-red-300">
            {historyQuery.error instanceof Error ? historyQuery.error.message : 'Transfer history unavailable.'}
          </Text>
        ) : historyQuery.data?.length ? (
          <View className="mt-3 gap-3">
            {historyQuery.data.slice(0, 5).map((entry) => (
              <View key={entry.id} className="rounded-xl bg-slate-950 p-3">
                <Text className="text-xs font-medium text-slate-400">
                  {entry.gameweekNumber ? `Gameweek ${entry.gameweekNumber}` : 'Transfer'} · {new Date(entry.createdAt).toLocaleDateString()}
                </Text>
                {entry.moves.map((move, index) => (
                  <Text key={`${entry.id}-${index}`} className="mt-2 text-sm text-slate-200">
                    {move.playerOut ?? '—'} → {move.playerIn ?? '—'}
                  </Text>
                ))}
                {entry.penaltyPoints !== null ? (
                  <Text className="mt-1 text-xs text-slate-400">Penalty: {entry.penaltyPoints} pts</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-2 text-sm text-slate-400">No transfer history yet.</Text>
        )}
      </View>
    </View>
  );
}
