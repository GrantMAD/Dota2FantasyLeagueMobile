import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { FantasyContext, FantasyPlayer, MarketPlayer } from './api';
import { getPlayerMarket, getTransferHistory, processTransfer } from './api';

interface TransferMarketProps {
  context: FantasyContext;
  userId: string;
}

function normalizeRole(role: string | null): string {
  return role?.trim().toLowerCase().replaceAll(' ', '_') ?? '';
}

function matchesRole(incoming: MarketPlayer, outgoing: FantasyPlayer): boolean {
  return Boolean(
    normalizeRole(incoming.primary_role) &&
    normalizeRole(incoming.primary_role) === normalizeRole(outgoing.primary_role)
  );
}

function playerName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export function TransferMarket({ context, userId }: TransferMarketProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedOutId, setSelectedOutId] = useState<number | null>(null);
  const [selectedInId, setSelectedInId] = useState<number | null>(null);
  const deferredSearch = useDeferredValue(search);
  const ownedIds = new Set(context.ownedPlayers.map((player) => player.id));
  const selectedOut = context.ownedPlayers.find((player) => player.id === selectedOutId) ?? null;

  const marketQuery = useQuery({
    queryKey: ['player-market', deferredSearch],
    queryFn: () => getPlayerMarket(deferredSearch),
    enabled: context.ownedPlayers.length > 0,
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
      Alert.alert(
        'Transfer completed',
        `Your squad has been updated. Penalty: ${result.penaltyPoints} points.`
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] }),
        queryClient.invalidateQueries({ queryKey: ['transfer-history', userId] }),
      ]);
    },
  });

  const incomingPlayers = (marketQuery.data ?? []).filter((player) => {
    if (ownedIds.has(player.id) || player.availability_status !== 'available') return false;
    return !selectedOut || matchesRole(player, selectedOut);
  });
  const selectedIn = incomingPlayers.find((player) => player.id === selectedInId) ?? null;
  const canTransfer = Boolean(
    context.fantasySeasonId &&
    !context.gameweek?.isLocked &&
    selectedOut &&
    selectedIn &&
    selectedIn.current_price !== null &&
    selectedOut.id !== selectedIn.id
  );

  function requestTransferConfirmation() {
    if (!canTransfer || !selectedOut || !selectedIn || !context.fantasySeasonId) return;
    Alert.alert(
      'Confirm transfer',
      `Transfer out ${playerName(selectedOut)} and bring in ${playerName(selectedIn)}? The server will validate budget, deadline, and transfer penalties.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm transfer',
          onPress: () => transferMutation.mutate({
            fantasySeasonId: context.fantasySeasonId!,
            transfersIn: [selectedIn.id],
            transfersOut: [selectedOut.id],
          }),
        },
      ]
    );
  }

  return (
    <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <View>
        <Text className="text-lg font-bold text-white">Transfer market</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-400">
          Choose one player to sell and an available player in the same role. The server calculates your budget and transfer penalty.
        </Text>
      </View>

      {context.gameweek?.isLocked ? (
        <View accessibilityRole="alert" className="rounded-xl border border-amber-800 bg-amber-950 p-3">
          <Text className="text-sm font-medium text-amber-100">Transfers are locked for this gameweek.</Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select player to sell</Text>
        {context.ownedPlayers.map((player) => {
          const selected = player.id === selectedOutId;
          return (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`min-h-14 justify-center rounded-xl border px-3 ${
                selected ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-950'
              }`}
              disabled={context.gameweek?.isLocked || transferMutation.isPending}
              onPress={() => {
                setSelectedOutId(selected ? null : player.id);
                setSelectedInId(null);
                transferMutation.reset();
              }}
            >
              <Text className="font-semibold text-white">{playerName(player)}</Text>
              <Text className="mt-1 text-xs text-slate-400">
                {player.primary_role ?? 'Role unavailable'} · {player.current_price.toFixed(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Search replacement</Text>
        <TextInput
          accessibilityLabel="Search available players"
          autoCapitalize="none"
          autoCorrect={false}
          className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white"
          editable={!context.gameweek?.isLocked && !transferMutation.isPending}
          onChangeText={(value) => {
            setSearch(value);
            setSelectedInId(null);
          }}
          placeholder={selectedOut ? `Search ${selectedOut.primary_role ?? 'players'}` : 'Select a player to sell first'}
          placeholderTextColor="#94a3b8"
          value={search}
        />
        {marketQuery.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading players" color="#fb923c" />
        ) : marketQuery.isError ? (
          <Text accessibilityRole="alert" className="text-sm text-red-300">
            {marketQuery.error instanceof Error ? marketQuery.error.message : 'Player market unavailable.'}
          </Text>
        ) : incomingPlayers.length > 0 ? (
          incomingPlayers.slice(0, 12).map((player) => {
            const selected = player.id === selectedInId;
            return (
              <Pressable
                key={player.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`min-h-14 justify-center rounded-xl border px-3 ${
                  selected ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-950'
                }`}
                disabled={!selectedOut || context.gameweek?.isLocked || transferMutation.isPending}
                onPress={() => {
                  setSelectedInId(selected ? null : player.id);
                  transferMutation.reset();
                }}
              >
                <Text className="font-semibold text-white">{playerName(player)}</Text>
                <Text className="mt-1 text-xs text-slate-400">
                  {player.primary_role ?? 'Role unavailable'} · {player.current_price === null ? 'Price unavailable' : player.current_price.toFixed(1)}
                  {player.recent_points === null ? '' : ` · Recent ${player.recent_points} pts`}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text className="py-3 text-sm leading-5 text-slate-400">
            {selectedOut ? 'No available players match this role and search.' : 'Choose a player to sell to see eligible replacements.'}
          </Text>
        )}
      </View>

      {selectedOut &&
      selectedIn &&
      selectedIn.current_price !== null &&
      selectedOut.current_price !== selectedIn.current_price ? (
        <Text className="text-xs leading-5 text-slate-400">
          Latest market price difference: {(selectedIn.current_price - selectedOut.current_price).toFixed(1)}. Final budget and penalties are confirmed by the server.
        </Text>
      ) : null}
      {transferMutation.error ? (
        <Text accessibilityRole="alert" className="text-sm leading-5 text-red-300">
          {transferMutation.error.message}
        </Text>
      ) : null}
      {transferMutation.isPending ? (
        <View className="flex-row items-center justify-center gap-2 py-2">
          <ActivityIndicator color="#fb923c" />
          <Text className="text-sm text-slate-300">Processing transfer</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canTransfer || transferMutation.isPending }}
          className={`min-h-12 items-center justify-center rounded-xl bg-brand-500 ${
            canTransfer ? 'active:opacity-80' : 'opacity-50'
          }`}
          disabled={!canTransfer}
          onPress={requestTransferConfirmation}
        >
          <Text className="font-bold text-white">Review transfer</Text>
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
