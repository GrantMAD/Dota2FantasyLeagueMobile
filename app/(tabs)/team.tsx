import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView as NativeScrollView,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { ChipActivationPanel } from '@/src/features/fantasy/ChipActivationPanel';
import { LineupEditor } from '@/src/features/fantasy/LineupEditor';
import { SquadBuilder } from '@/src/features/fantasy/SquadBuilder';
import { TransferMarket } from '@/src/features/fantasy/TransferMarket';
import { WildcardPanel } from '@/src/features/fantasy/WildcardPanel';
import { WildcardTransferBuilder } from '@/src/features/fantasy/WildcardTransferBuilder';
import { SquadRosterView } from '@/src/features/fantasy/SquadRosterView';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { getTransferHistory, getTransferHistoryAnalytics } from '@/src/features/fantasy/api';
import type { TransferInsight } from '@/src/features/fantasy/transfer-history-analytics';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

function SquadValueChart({ data }: { data: { gameweekNumber: number; value: number | null }[] }) {
  const [width, setWidth] = useState(0);
  const height = 190;
  const left = 42;
  const right = 12;
  const top = 14;
  const bottom = 22;
  const values = data.flatMap((point) => point.value === null ? [] : [point.value]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const plotWidth = Math.max(0, width - left - right);
  const plotHeight = height - top - bottom;
  const xForIndex = (index: number) => left + (data.length <= 1 ? plotWidth / 2 : index * plotWidth / (data.length - 1));
  const yForValue = (value: number) => top + ((max - value) / range) * plotHeight;
  const segments: string[] = [];
  let segment = '';

  data.forEach((point, index) => {
    if (point.value === null) {
      if (segment) segments.push(segment);
      segment = '';
      return;
    }
    segment += `${segment ? ' L' : 'M'} ${xForIndex(index)} ${yForValue(point.value)}`;
  });
  if (segment) segments.push(segment);

  return (
    <View
      accessibilityLabel="Squad market value by completed gameweek, excluding bank balance"
      className="h-48 w-full"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && values.length > 0 ? (
        <Svg height={height} width={width}>
          {[0, 0.5, 1].map((fraction) => {
            const y = top + fraction * plotHeight;
            return <Line key={fraction} x1={left} x2={width - right} y1={y} y2={y} stroke="#334155" strokeDasharray="4 4" />;
          })}
          {segments.map((path, index) => (
            <Path key={index} d={path} fill="none" stroke="#22d3ee" strokeWidth={2.5} />
          ))}
          {data.map((point, index) => point.value === null ? null : (
            <Circle
              key={point.gameweekNumber}
              cx={xForIndex(index)}
              cy={yForValue(point.value)}
              r={3.5}
              fill="#22d3ee"
            />
          ))}
        </Svg>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-xs text-slate-400">
            {data.length ? 'No complete price snapshots are available to chart.' : 'Completed gameweek history is not available yet.'}
          </Text>
        </View>
      )}
      {values.length > 0 ? (
        <View className="flex-row justify-between px-1">
          <Text className="text-[10px] text-slate-500">GW {data[0]?.gameweekNumber}</Text>
          <Text className="text-[10px] text-slate-500">GW {data[data.length - 1]?.gameweekNumber}</Text>
        </View>
      ) : null}
      {values.length > 0 ? (
        <Text className="mt-1 text-center text-[10px] text-slate-500">
          Player value ($M): {min.toFixed(1)}–{max.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
}

function TransferInsightCard({ title, insight, positive, hasTransfers, loading, error }: {
  title: string;
  insight: TransferInsight | null;
  positive: boolean;
  hasTransfers: boolean;
  loading: boolean;
  error: boolean;
}) {
  return (
    <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
      <Text className="text-xs font-bold text-white">{title}</Text>
      {insight ? (
        <>
          <Text className="mt-2 text-xs text-slate-200" numberOfLines={2}>
            {insight.playerOut} → {insight.playerIn}
          </Text>
          <Text className={`mt-1 text-base font-bold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {insight.netPoints > 0 ? '+' : ''}{insight.netPoints.toFixed(1)} pts
          </Text>
          <Text className="mt-1 text-[10px] text-slate-400">
            Net points over GW {insight.gameweekNumbers.join(', ')}
          </Text>
        </>
      ) : (
        <Text className="mt-2 text-xs text-slate-400">
          {error
            ? 'Transfer insights could not be loaded.'
            : loading
              ? 'Loading transfer insights…'
              : hasTransfers
                ? 'No swap has a fully completed three-gameweek window yet.'
                : 'No transfer swaps are recorded yet.'}
        </Text>
      )}
    </View>
  );
}

export default function TeamScreen() {
  const { theme } = useMobileTheme();
  const lineupPlanIconTint = theme === 'dark' ? '#2dd4bf' : '#0f766e';
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
  const [isGameweekPickerVisible, setIsGameweekPickerVisible] = useState(false);
  const [tabSelection, setTabSelection] = useState<{
    tab: 'squad' | 'lineup' | 'transfers' | 'history';
    quickAddKey: string | null;
  } | null>(null);
  const lineupQuery = useFantasyContext(selectedGameweekId);
  const { session } = useAuth();
  const quickAddKey = quickAddPlayerId ? `${quickAddPlayerId}:${quickAddPlayerName ?? ''}` : null;
  const activeTab = tabSelection?.quickAddKey === quickAddKey
    ? tabSelection.tab
    : quickAddKey && (query.data?.ownedPlayers.length ?? 0) >= 8
      ? 'transfers'
      : 'squad';
  const lineupContext = selectedGameweekId === undefined ? query.data : lineupQuery.data;
  const defaultGameweekId = query.data?.defaultGameweekId ?? query.data?.gameweek?.id ?? null;
  const lineupGameweeks = useMemo(() => {
    const gameweeks = query.data?.availableGameweeks ?? [];
    const currentGameweek = query.data?.gameweek;
    const withCurrentGameweek = currentGameweek &&
      !gameweeks.some((gameweek) => gameweek.id === currentGameweek.id)
      ? [...gameweeks, currentGameweek]
      : gameweeks;
    const activeGameweekId = currentGameweek?.id ?? query.data?.defaultGameweekId;
    if (activeGameweekId === null || activeGameweekId === undefined) {
      return withCurrentGameweek;
    }

    return [...withCurrentGameweek].sort((left, right) => {
      if (left.id === activeGameweekId) return -1;
      if (right.id === activeGameweekId) return 1;
      return left.gameweekNumber - right.gameweekNumber;
    });
  }, [query.data?.availableGameweeks, query.data?.defaultGameweekId, query.data?.gameweek]);
  const selectedLineupGameweek = lineupGameweeks.find(
    (gameweek) => gameweek.id === (selectedGameweekId ?? defaultGameweekId)
  ) ?? null;
  const isCurrentLineupGameweek = (gameweekId: number, status: string) =>
    gameweekId === (query.data?.gameweek?.id ?? defaultGameweekId) || status === 'active';
  const historyQuery = useQuery({
    queryKey: ['transfer-history-analytics', session?.user.id],
    queryFn: getTransferHistoryAnalytics,
    enabled: Boolean(session?.user.id),
    staleTime: 60_000,
  });
  const transferHistoryQuery = useQuery({
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
    const records = transferHistoryQuery.data ?? [];
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
  }, [transferHistoryQuery.data]);
  const historySummaryUnavailable = transferHistoryQuery.isPending || transferHistoryQuery.isError;

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
              void transferHistoryQuery.refetch();
            }}
            refreshing={query.isRefetching || historyQuery.isRefetching || transferHistoryQuery.isRefetching}
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
          <View className="mt-3">
            <DataFreshnessBadge page="transfers" />
          </View>
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

            <View accessibilityRole="tablist" className="flex-row flex-wrap gap-2">
              {([
                ['squad', `Squad ${query.data.ownedPlayers.length}/8`],
                ['lineup', 'Lineup'],
                ['transfers', 'Transfers'],
                ['history', 'History'],
              ] as const).map(([tab, label]) => (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === tab }}
                  className={`min-h-11 flex-1 min-w-[45%] items-center justify-center rounded-xl border px-3 ${
                    activeTab === tab
                      ? 'border-brand-500 bg-brand-500/15'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                  onPress={() => setTabSelection({ tab, quickAddKey })}
                >
                  <Text className={`text-sm font-bold ${activeTab === tab ? 'text-brand-300' : 'text-slate-400'}`}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab === 'history' ? (
              /* Enhanced Transfer History Timeline */
              <View className="gap-4">
                {/* 4-Tile Summary */}
                <View className="flex-row flex-wrap gap-2">
                  <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Transactions</Text>
                    <Text className="mt-1 text-lg font-bold text-white">
                      {historySummaryUnavailable ? '—' : historySummary.totalTransfers}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Moves</Text>
                    <Text className="mt-1 text-lg font-bold text-cyan-400">
                      {historySummaryUnavailable ? '—' : historySummary.totalMoves}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Penalties</Text>
                    <Text className={`mt-1 text-lg font-bold ${
                      historySummaryUnavailable
                        ? 'text-slate-400'
                        : historySummary.totalPenalty > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {historySummaryUnavailable
                        ? '—'
                        : historySummary.totalPenalty > 0 ? `-${historySummary.totalPenalty} pts` : '0 pts'}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Gameweeks</Text>
                    <Text className="mt-1 text-lg font-bold text-amber-400">
                      {historySummaryUnavailable ? '—' : historySummary.totalGameweeks}
                    </Text>
                  </View>
                </View>

                <View className="gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Budget Change</Text>
                    <Text className={`font-mono text-lg font-bold ${
                      historyQuery.data?.analytics.netBudgetChange === null || !historyQuery.data
                        ? 'text-slate-400'
                        : historyQuery.data.analytics.netBudgetChange > 0
                          ? 'text-emerald-400'
                          : historyQuery.data.analytics.netBudgetChange < 0
                            ? 'text-rose-400'
                            : 'text-white'
                    }`}>
                      {!historyQuery.data || historyQuery.data.analytics.netBudgetChange === null
                        ? 'Unavailable'
                        : `${historyQuery.data.analytics.netBudgetChange > 0 ? '+$' : historyQuery.data.analytics.netBudgetChange < 0 ? '-$' : '$'}${Math.abs(historyQuery.data.analytics.netBudgetChange).toFixed(1)}M`}
                    </Text>
                  </View>
                  {historyQuery.isError ? (
                    <View className="gap-2">
                      <Text accessibilityRole="alert" className="text-xs text-red-300">
                        {historyQuery.error instanceof Error
                          ? historyQuery.error.message
                          : 'Transfer history analytics could not be loaded.'}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        className="min-h-10 justify-center self-start"
                        onPress={() => void historyQuery.refetch()}
                      >
                        <Text className="font-semibold text-white">Retry analytics</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text className="text-xs text-slate-400">
                      Based on {historyQuery.data?.analytics.pricedTransactions ?? 0} of {historyQuery.data?.analytics.totalTransactions ?? 0} fully priced transactions.
                    </Text>
                  )}
                  <View className="border-t border-slate-800 pt-3">
                    <Text className="text-sm font-semibold text-white">Owned Squad Value</Text>
                    <Text className="mt-1 text-xs text-slate-400">
                      Historical player market value by completed gameweek, excluding bank balance.
                    </Text>
                    {historyQuery.data ? (
                      <SquadValueChart data={historyQuery.data.analytics.squadValueHistory} />
                    ) : historyQuery.isError ? (
                      <Text accessibilityRole="alert" className="py-8 text-center text-xs text-red-300">
                        Unable to load squad value history.
                      </Text>
                    ) : (
                      <ActivityIndicator accessibilityLabel="Loading squad value history" className="py-8" color="#14b8a6" />
                    )}
                    {historyQuery.data?.analytics.squadValueHistory.some((point) => point.value === null) ? (
                      <Text className="text-[10px] text-slate-500">
                        Gaps indicate incomplete ownership or player-price history.
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <TransferInsightCard
                    title="Best Transfer"
                    insight={historyQuery.data?.analytics.bestTransfer ?? null}
                    positive
                    hasTransfers={Boolean(transferHistoryQuery.data?.length)}
                    loading={historyQuery.isPending}
                    error={historyQuery.isError}
                  />
                  <TransferInsightCard
                    title="Worst Transfer"
                    insight={historyQuery.data?.analytics.worstTransfer ?? null}
                    positive={false}
                    hasTransfers={Boolean(transferHistoryQuery.data?.length)}
                    loading={historyQuery.isPending}
                    error={historyQuery.isError}
                  />
                </View>

                {transferHistoryQuery.isPending ? (
                  <ActivityIndicator accessibilityLabel="Loading transfer history" className="py-6" color="#14b8a6" />
                ) : transferHistoryQuery.isError ? (
                  <View className="gap-2 rounded-xl border border-red-900 bg-red-950 p-4">
                    <Text className="text-sm text-red-200">
                      {transferHistoryQuery.error instanceof Error
                        ? transferHistoryQuery.error.message
                        : 'Unable to load transfer history.'}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-10 justify-center self-start"
                      onPress={() => void transferHistoryQuery.refetch()}
                    >
                      <Text className="font-semibold text-white">Try again</Text>
                    </Pressable>
                  </View>
                ) : transferHistoryQuery.data?.length ? (
                  <View className="gap-3">
                    {transferHistoryQuery.data.map((entry) => {
                      const analyticsEntry = historyQuery.data?.transfers.find(
                        (transfer) => transfer.id === entry.id
                      );
                      return (
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
                          {entry.moves.map((move, index) => {
                            const analyticsMove = analyticsEntry?.moves[index];
                            return (
                            <View key={`${entry.id}-${index}`} className="gap-1">
                              <View className="flex-row items-center gap-2">
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
                              <Text className="text-[10px] text-slate-400">
                                Budget impact: {typeof analyticsMove?.budgetImpact !== 'number'
                                  ? 'unavailable'
                                  : `${analyticsMove.budgetImpact > 0 ? '+$' : analyticsMove.budgetImpact < 0 ? '-$' : '$'}${Math.abs(analyticsMove.budgetImpact).toFixed(1)}M`}
                                {typeof analyticsMove?.netPointsNextThreeGameweeks === 'number'
                                  ? ` · Three-gameweek net: ${analyticsMove.netPointsNextThreeGameweeks > 0 ? '+' : ''}${analyticsMove.netPointsNextThreeGameweeks.toFixed(1)} pts`
                                  : ''}
                                </Text>
                            </View>
                          );})}
                        </View>
                        <View className="mt-3 border-t border-slate-800 pt-2">
                          <Text className="text-xs text-slate-400">
                            Transaction budget impact: {typeof analyticsEntry?.budgetImpact !== 'number'
                              ? 'unavailable'
                              : `${analyticsEntry.budgetImpact > 0 ? '+$' : analyticsEntry.budgetImpact < 0 ? '-$' : '$'}${Math.abs(analyticsEntry.budgetImpact).toFixed(1)}M`}
                          </Text>
                        </View>
                      </View>
                    );})}
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
                {activeTab === 'squad' && session?.user.id && query.data.ownedPlayers.length < 8 ? (
                  <SquadBuilder
                    context={query.data}
                    userId={session.user.id}
                    quickAddPlayerId={quickAddPlayerId}
                    quickAddPlayerName={quickAddPlayerName}
                  />
                ) : null}
                {activeTab === 'lineup' ? (
                  <>
                {lineupGameweeks.length > 0 ? (
                  <View className="gap-4 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4">
                    <View className="flex-row items-start gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-xl border border-brand-500/30 bg-brand-500/15">
                        <SymbolView
                          name={{ ios: 'calendar.badge.clock', android: 'event', web: 'event' }}
                          size={20}
                          tintColor={lineupPlanIconTint}
                        />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-base font-bold text-slate-50">Plan a lineup</Text>
                        <Text className="mt-1 text-sm leading-5 text-slate-400">
                          Choose a gameweek to view or prepare its lineup. Each gameweek is saved separately.
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Select gameweek for lineup"
                      accessibilityState={{ expanded: isGameweekPickerVisible }}
                      className="min-h-14 flex-row items-center justify-between rounded-xl border border-brand-500/40 bg-slate-950 px-4 py-3"
                      onPress={() => setIsGameweekPickerVisible(true)}
                    >
                      <View>
                        <Text className="text-sm font-bold text-slate-50">
                          {selectedLineupGameweek
                            ? `Gameweek ${selectedLineupGameweek.gameweekNumber}`
                            : 'Choose a gameweek'}
                        </Text>
                        {selectedLineupGameweek ? (
                          <View className="mt-1 flex-row flex-wrap gap-1">
                            {isCurrentLineupGameweek(selectedLineupGameweek.id, selectedLineupGameweek.status) ? (
                              <View className="rounded-full bg-emerald-500/15 px-2 py-0.5">
                                <Text className="text-[10px] font-semibold text-emerald-300">Active</Text>
                              </View>
                            ) : null}
                            {selectedLineupGameweek.isLocked ? (
                              <View className="rounded-full bg-rose-500/15 px-2 py-0.5">
                                <Text className="text-[10px] font-semibold text-rose-300">Locked</Text>
                              </View>
                            ) : !isCurrentLineupGameweek(selectedLineupGameweek.id, selectedLineupGameweek.status) ? (
                              <View className="rounded-full bg-cyan-500/15 px-2 py-0.5">
                                <Text className="text-[10px] font-semibold text-cyan-300">Plan ahead</Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                      <SymbolView
                        name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                        size={20}
                        tintColor={lineupPlanIconTint}
                      />
                    </Pressable>
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
                          width: '100%',
                          height: '100%',
                          backgroundColor: theme === 'dark'
                            ? 'rgba(2, 6, 23, 0.82)'
                            : 'rgba(15, 23, 42, 0.55)',
                        }}
                      >
                        <View
                          className="gap-3 rounded-2xl border bg-slate-950 p-4"
                          style={{
                            maxHeight: '70%',
                            borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
                            backgroundColor: theme === 'dark' ? '#020617' : '#ffffff',
                          }}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text
                              className="text-lg font-bold"
                              style={{ color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                            >
                              Select gameweek
                            </Text>
                            <Pressable
                              accessibilityRole="button"
                              className="min-h-10 justify-center px-2"
                              onPress={() => setIsGameweekPickerVisible(false)}
                            >
                              <Text
                                className="font-semibold"
                                style={{ color: theme === 'dark' ? '#5eead4' : '#0f766e' }}
                              >
                                Close
                              </Text>
                            </Pressable>
                          </View>
                          <NativeScrollView
                            style={{ flexGrow: 0 }}
                            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                          >
                            {lineupGameweeks.map((gameweek) => {
                              const isSelected = (selectedGameweekId ?? defaultGameweekId) === gameweek.id;
                              return (
                                <Pressable
                                  key={gameweek.id}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected: isSelected }}
                                  accessibilityLabel={`Gameweek ${gameweek.gameweekNumber}, ${
                                    gameweek.isLocked ? 'lineup locked' : gameweek.status === 'active' ? 'current active gameweek' : 'planning ahead'
                                  }`}
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
                                      gameweek.id === defaultGameweekId ? undefined : gameweek.id
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
                                    <View className="mt-1 flex-row flex-wrap gap-1">
                                      {isCurrentLineupGameweek(gameweek.id, gameweek.status) ? (
                                        <View
                                          className="rounded-full px-2 py-0.5"
                                          style={{ backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }}
                                        >
                                          <Text
                                            className="text-[10px] font-semibold"
                                            style={{ color: theme === 'dark' ? '#6ee7b7' : '#047857' }}
                                          >
                                            Active
                                          </Text>
                                        </View>
                                      ) : null}
                                      {gameweek.isLocked ? (
                                        <View
                                          className="rounded-full px-2 py-0.5"
                                          style={{ backgroundColor: theme === 'dark' ? 'rgba(244, 63, 94, 0.15)' : '#fff1f2' }}
                                        >
                                          <Text
                                            className="text-[10px] font-semibold"
                                            style={{ color: theme === 'dark' ? '#fda4af' : '#be123c' }}
                                          >
                                            Locked
                                          </Text>
                                        </View>
                                      ) : !isCurrentLineupGameweek(gameweek.id, gameweek.status) ? (
                                        <View
                                          className="rounded-full px-2 py-0.5"
                                          style={{ backgroundColor: theme === 'dark' ? 'rgba(6, 182, 212, 0.15)' : '#ecfeff' }}
                                        >
                                          <Text
                                            className="text-[10px] font-semibold"
                                            style={{ color: theme === 'dark' ? '#67e8f9' : '#0e7490' }}
                                          >
                                            Plan ahead
                                          </Text>
                                        </View>
                                      ) : null}
                                    </View>
                                  </View>
                                  {isSelected ? (
                                    <SymbolView
                                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                                      size={18}
                                      tintColor={lineupPlanIconTint}
                                    />
                                  ) : null}
                                </Pressable>
                              );
                            })}
                          </NativeScrollView>
                        </View>
                      </View>
                    </Modal>
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
                  </>
                ) : null}
                {activeTab === 'transfers' ? (
                  <>
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
                  </>
                ) : null}
                {activeTab === 'squad' ? (
                  <>
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
                <View className="gap-2">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your squad</Text>
                  <SquadRosterView players={query.data.ownedPlayers} lineup={query.data.lineup} />
                </View>
                  </>
                ) : null}
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
