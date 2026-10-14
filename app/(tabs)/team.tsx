import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { ChipActivationPanel } from '@/src/features/fantasy/ChipActivationPanel';
import { LineupEditor } from '@/src/features/fantasy/LineupEditor';
import { SquadBuilder } from '@/src/features/fantasy/SquadBuilder';
import { TransferMarket } from '@/src/features/fantasy/TransferMarket';
import { WildcardPanel } from '@/src/features/fantasy/WildcardPanel';
import { WildcardTransferBuilder } from '@/src/features/fantasy/WildcardTransferBuilder';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { getTransferHistory } from '@/src/features/fantasy/api';
import { useAuth } from '@/src/lib/auth';

export default function TeamScreen() {
  const params = useLocalSearchParams<{ quickAddPlayerId?: string; quickAddPlayerName?: string }>();
  const parsedQuickAddId = Number(params.quickAddPlayerId);
  const quickAddPlayerId = Number.isSafeInteger(parsedQuickAddId) && parsedQuickAddId > 0
    ? parsedQuickAddId
    : undefined;
  const quickAddPlayerName = typeof params.quickAddPlayerName === 'string'
    ? params.quickAddPlayerName
    : undefined;
  const query = useFantasyContext();
  const [selectedGameweekId, setSelectedGameweekId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<'squad' | 'history'>('squad');
  const lineupQuery = useFantasyContext(selectedGameweekId);
  const { session } = useAuth();
  const lineupContext = selectedGameweekId === undefined ? query.data : lineupQuery.data;
  const defaultGameweekId = query.data?.defaultGameweekId ?? query.data?.gameweek?.id ?? null;
  const lineupByPlayer = useMemo(
    () => new Map((query.data?.lineup ?? []).map((entry) => [entry.player_id, entry])),
    [query.data?.lineup]
  );

  const historyQuery = useQuery({
    queryKey: ['transfer-history', session?.user.id],
    queryFn: getTransferHistory,
    enabled: Boolean(session?.user.id),
    staleTime: 60_000,
  });

  // Budget calculations
  const squadValue = useMemo(() => {
    return (query.data?.ownedPlayers ?? []).reduce(
      (sum, p) => sum + (typeof p.current_price === 'number' ? p.current_price : 0),
      0
    );
  }, [query.data?.ownedPlayers]);
  const budget = typeof query.data?.budget === 'number' ? query.data.budget : 0;
  const totalAccountValue = squadValue + budget;
  const squadValuePercent = totalAccountValue > 0
    ? Math.min(100, Math.max(0, (squadValue / totalAccountValue) * 100))
    : 0;
  const bankPercent = totalAccountValue > 0
    ? Math.min(100 - squadValuePercent, Math.max(0, (budget / totalAccountValue) * 100))
    : 0;

  // Transfer history summary calculations
  const historySummary = useMemo(() => {
    const records = historyQuery.data ?? [];
    let totalMoves = 0;
    let totalPenalty = 0;
    const gameweeks = new Set<number>();

    for (const record of records) {
      totalMoves += record.moves.length;
      if (typeof record.penaltyPoints === 'number' && record.penaltyPoints > 0) {
        totalPenalty += record.penaltyPoints;
      }
      if (record.gameweekNumber !== null) {
        gameweeks.add(record.gameweekNumber);
      }
    }

    return {
      totalTransfers: records.length,
      totalMoves,
      totalPenalty,
      totalGameweeks: gameweeks.size,
    };
  }, [historyQuery.data]);

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            colors={['#14b8a6']}
            onRefresh={() => {
              void query.refetch();
              if (selectedGameweekId !== undefined) void lineupQuery.refetch();
              void historyQuery.refetch();
            }}
            refreshing={query.isRefetching}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Fantasy Dota 2</Text>
          <Text className="mt-2 text-3xl font-bold text-white">My Team</Text>
          <Text className="mt-1 text-sm text-slate-400">
            {query.data?.gameweek
              ? `Gameweek ${query.data.gameweek.gameweekNumber} · ${query.data.gameweek.status}`
              : 'Your current fantasy squad'}
          </Text>
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading fantasy squad" className="gap-3">
            <View className="h-24 rounded-2xl bg-slate-800" />
            <View className="h-24 rounded-2xl bg-slate-800" />
            <View className="h-24 rounded-2xl bg-slate-800" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Squad unavailable</Text>
            <Text className="mt-2 text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Please try again.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-4 min-h-11 justify-center"
              onPress={() => void query.refetch()}
            >
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data && query.data.ownedPlayers.length > 0 ? (
          <>
            {/* Budget & Valuation Breakdown Card */}
            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Budget & Valuation
                </Text>
                <Text className="text-xs font-bold text-slate-400">
                  Total: <Text className="font-mono text-white">${totalAccountValue.toFixed(1)}M</Text>
                </Text>
              </View>

              {/* Dual Proportional Bar */}
              <View className="h-3 w-full overflow-hidden rounded-full bg-slate-950 flex-row">
                <View
                  style={{ width: `${squadValuePercent}%` }}
                  className="h-full bg-cyan-400"
                />
                <View
                  style={{ width: `${bankPercent}%` }}
                  className="h-full bg-emerald-400"
                />
              </View>

              <View className="flex-row items-center justify-between pt-1">
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-full bg-cyan-400" />
                  <Text className="text-xs text-slate-300">
                    Squad: <Text className="font-mono font-bold text-white">${squadValue.toFixed(1)}M</Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-full bg-emerald-400" />
                  <Text className="text-xs text-slate-300">
                    In Bank: <Text className="font-mono font-bold text-emerald-300">${budget.toFixed(1)}M</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* View Switcher Tabs: Squad vs Transfer History */}
            <View className="flex-row border-b border-slate-800">
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'squad' }}
                className={`flex-1 items-center pb-3 border-b-2 ${
                  activeTab === 'squad' ? 'border-brand-500' : 'border-transparent'
                }`}
                onPress={() => setActiveTab('squad')}
              >
                <Text className={`text-sm font-bold ${activeTab === 'squad' ? 'text-brand-300' : 'text-slate-400'}`}>
                  My Squad ({query.data.ownedPlayers.length}/8)
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'history' }}
                className={`flex-1 items-center pb-3 border-b-2 ${
                  activeTab === 'history' ? 'border-brand-500' : 'border-transparent'
                }`}
                onPress={() => setActiveTab('history')}
              >
                <Text className={`text-sm font-bold ${activeTab === 'history' ? 'text-brand-300' : 'text-slate-400'}`}>
                  Transfer History
                </Text>
              </Pressable>
            </View>

            {activeTab === 'history' && !quickAddPlayerId ? (
              /* Enhanced Transfer History Timeline */
              <View className="gap-4">
                {/* 4-Tile Summary */}
                <View className="flex-row flex-wrap gap-2">
                  <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Transactions</Text>
                    <Text className="mt-1 text-lg font-bold text-white">{historySummary.totalTransfers}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Moves</Text>
                    <Text className="mt-1 text-lg font-bold text-cyan-400">{historySummary.totalMoves}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Penalties</Text>
                    <Text className={`mt-1 text-lg font-bold ${historySummary.totalPenalty > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {historySummary.totalPenalty > 0 ? `-${historySummary.totalPenalty} pts` : '0 pts'}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Gameweeks</Text>
                    <Text className="mt-1 text-lg font-bold text-amber-400">{historySummary.totalGameweeks}</Text>
                  </View>
                </View>

                {historyQuery.isPending ? (
                  <ActivityIndicator accessibilityLabel="Loading transfer history" className="py-6" color="#14b8a6" />
                ) : historyQuery.isError ? (
                  <View className="rounded-xl border border-red-900 bg-red-950 p-4">
                    <Text className="text-sm text-red-200">
                      {historyQuery.error instanceof Error ? historyQuery.error.message : 'Unable to load transfer history.'}
                    </Text>
                  </View>
                ) : historyQuery.data?.length ? (
                  <View className="gap-3">
                    {historyQuery.data.map((entry) => (
                      <View key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                        <View className="flex-row items-center justify-between border-b border-slate-800 pb-2">
                          <View className="flex-row items-center gap-2">
                            {entry.gameweekNumber !== null ? (
                              <View className="rounded-md bg-amber-500/20 px-2 py-0.5 border border-amber-500/30">
                                <Text className="text-[10px] font-bold text-amber-300">GW {entry.gameweekNumber}</Text>
                              </View>
                            ) : null}
                            <Text className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</Text>
                          </View>
                          {entry.penaltyPoints !== null && entry.penaltyPoints > 0 ? (
                            <View className="rounded-md bg-rose-500/20 px-2 py-0.5 border border-rose-500/30">
                              <Text className="text-[10px] font-bold text-rose-300">-{entry.penaltyPoints} pts</Text>
                            </View>
                          ) : (
                            <View className="rounded-md bg-emerald-500/20 px-2 py-0.5 border border-emerald-500/30">
                              <Text className="text-[10px] font-bold text-emerald-300">Free</Text>
                            </View>
                          )}
                        </View>
                        <View className="pt-3 gap-2">
                          {entry.moves.map((move, index) => (
                            <View key={`${entry.id}-${index}`} className="flex-row items-center gap-2">
                              <View className="flex-1 rounded-lg bg-rose-950/40 border border-rose-900/40 px-2.5 py-1.5">
                                <Text className="text-xs font-semibold text-rose-300" numberOfLines={1}>
                                  ▼ {move.playerOut ?? 'Squad addition'}
                                </Text>
                              </View>
                              <Text className="text-slate-500 font-bold">→</Text>
                              <View className="flex-1 rounded-lg bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-1.5">
                                <Text className="text-xs font-semibold text-emerald-300" numberOfLines={1}>
                                  ▲ {move.playerIn ?? 'Squad removal'}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="rounded-2xl border border-dashed border-slate-800 p-8 items-center justify-center">
                    <Text className="text-sm text-slate-400">No transfer history is recorded yet.</Text>
                  </View>
                )}
              </View>
            ) : (
              /* Squad Management Tab */
              <>
                {session?.user.id && query.data.ownedPlayers.length < 8 ? (
                  <SquadBuilder
                    context={query.data}
                    userId={session.user.id}
                    quickAddPlayerId={quickAddPlayerId}
                    quickAddPlayerName={quickAddPlayerName}
                  />
                ) : null}
                {query.data.availableGameweeks.length > 1 ? (
                  <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <View>
                      <Text className="text-base font-semibold text-white">Plan a lineup</Text>
                      <Text className="mt-1 text-sm text-slate-400">
                        Choose the active or an upcoming gameweek. Each lineup is saved separately.
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {query.data.availableGameweeks.map((gameweek) => {
                        const isSelected = (selectedGameweekId ?? defaultGameweekId) === gameweek.id;
                        return (
                          <Pressable
                            key={gameweek.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            className={`min-h-11 justify-center rounded-full border px-4 ${
                              isSelected ? 'border-brand-500 bg-brand-500/20' : 'border-slate-700 bg-slate-950'
                            }`}
                            onPress={() => setSelectedGameweekId(
                              gameweek.id === defaultGameweekId ? undefined : gameweek.id
                            )}
                          >
                            <Text className={`text-sm font-semibold ${isSelected ? 'text-brand-400' : 'text-slate-200'}`}>
                              Gameweek {gameweek.gameweekNumber}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
                {session?.user.id ? (
                  selectedGameweekId !== undefined && lineupQuery.isPending ? (
                    <ActivityIndicator accessibilityLabel="Loading selected gameweek lineup" color="#14b8a6" />
                  ) : selectedGameweekId !== undefined && lineupQuery.isError ? (
                    <View accessibilityRole="alert" className="rounded-2xl border border-red-900 bg-red-950 p-4">
                      <Text className="font-semibold text-red-200">Lineup unavailable</Text>
                      <Text className="mt-2 text-sm text-red-100">
                        {lineupQuery.error instanceof Error ? lineupQuery.error.message : 'Please try again.'}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        className="mt-3 min-h-11 justify-center"
                        onPress={() => void lineupQuery.refetch()}
                      >
                        <Text className="font-semibold text-white">Try again</Text>
                      </Pressable>
                    </View>
                  ) : lineupContext ? (
                    <LineupEditor
                      key={`${lineupContext.gameweek?.id ?? 'none'}:${lineupContext.lineup.map((entry) => `${entry.slot}-${entry.player_id}-${entry.is_captain}-${entry.is_vice_captain}`).join(',')}`}
                      context={lineupContext}
                      userId={session.user.id}
                    />
                  ) : null
                ) : null}
                {session?.user.id ? <ChipActivationPanel context={query.data} userId={session.user.id} /> : null}
                {session?.user.id ? <WildcardPanel context={query.data} userId={session.user.id} /> : null}
                {session?.user.id && query.data.chips.wildcardUsedGameweekId === query.data.gameweek?.id ? (
                  <WildcardTransferBuilder
                    key={`${query.data.gameweek?.id ?? 'none'}:${query.data.ownedPlayers.map((player) => player.id).sort((a, b) => a - b).join(',')}`}
                    context={query.data}
                    userId={session.user.id}
                  />
                ) : session?.user.id ? (
                  <TransferMarket
                    key={`${query.data.gameweek?.id ?? 'none'}:${query.data.ownedPlayers.map((player) => player.id).sort((a, b) => a - b).join(',')}`}
                    context={query.data}
                    userId={session.user.id}
                    quickAddPlayerId={query.data.ownedPlayers.length >= 8 ? quickAddPlayerId : undefined}
                    quickAddPlayerName={query.data.ownedPlayers.length >= 8 ? quickAddPlayerName : undefined}
                  />
                ) : null}
                <View className="flex-row gap-3">
                  <View className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">Players</Text>
                    <Text className="mt-2 text-2xl font-bold text-white">{query.data.ownedPlayers.length}</Text>
                  </View>
                  <View className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">Lineup set</Text>
                    <Text className="mt-2 text-2xl font-bold text-white">{query.data.lineup.length}</Text>
                  </View>
                </View>
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your squad</Text>
                {query.data.ownedPlayers.map((player) => {
                  const lineupEntry = lineupByPlayer.get(player.id);
                  return (
                    <View key={player.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-white">{player.name}</Text>
                          {player.in_game_name ? (
                            <Text className="mt-1 text-sm text-slate-400">{player.in_game_name}</Text>
                          ) : null}
                          <Text className="mt-2 text-xs font-medium uppercase tracking-wider text-brand-400">
                            {player.primary_role?.replaceAll('_', ' ') ?? 'Role unavailable'}
                          </Text>
                        </View>
                        <Text className="text-sm font-semibold text-slate-200">{player.current_price.toFixed(1)}</Text>
                      </View>
                      <View className="mt-4 flex-row flex-wrap gap-2">
                        {lineupEntry?.is_starter ? (
                          <Badge label={lineupEntry.slot.replaceAll('_', ' ')} />
                        ) : null}
                        {lineupEntry?.is_captain ? <Badge label="Captain" highlighted /> : null}
                        {lineupEntry?.is_vice_captain ? <Badge label="Vice-captain" highlighted /> : null}
                        {!lineupEntry ? <Badge label="Not in current lineup" /> : null}
                        {player.availability_status ? <Badge label={player.availability_status.replaceAll('_', ' ')} /> : null}
                      </View>
                      <Text className="mt-3 text-xs text-slate-400">
                        Last gameweek {player.last_gw_points} pts · Recent average {player.recent_points} pts
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </>
        ) : (
          query.data && session?.user.id ? (
            <SquadBuilder
              context={query.data}
              userId={session.user.id}
              quickAddPlayerId={quickAddPlayerId}
              quickAddPlayerName={quickAddPlayerName}
            />
          ) : (
            <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="font-semibold text-white">No squad found</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-400">
                Your squad will appear here once it has been created.
              </Text>
            </View>
          )
        )}

        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Updating squad" color="#14b8a6" /> : null}
      </ScrollView>
    </Screen>
  );
}

function Badge({ label, highlighted = false }: { label: string; highlighted?: boolean }) {
  return (
    <View className={`rounded-full px-3 py-1 ${highlighted ? 'bg-brand-500/20' : 'bg-slate-800'}`}>
      <Text className={`text-xs font-medium ${highlighted ? 'text-brand-400' : 'text-slate-300'}`}>{label}</Text>
    </View>
  );
}
