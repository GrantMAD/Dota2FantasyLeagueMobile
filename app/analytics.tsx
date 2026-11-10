import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, Text, View, type LayoutChangeEvent } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { SymbolView } from 'expo-symbols';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { getAnalytics } from '@/src/features/analytics/api';
import type { AnalyticsPlayer, AnalyticsRole, AnalyticsTrend } from '@/src/features/analytics/api';
import {
  getAnalyticsTrendForRange,
  getCaptainEfficiencyAssessment,
  serializeAnalyticsCsv,
  type AnalyticsTrendRange,
} from '@/src/features/analytics/presentation';

const roleColors = ['#06b6d4', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

type AnalyticsIconName = ComponentProps<typeof SymbolView>['name'];

function AnalyticsIcon({ name, size = 17 }: { name: AnalyticsIconName; size?: number }) {
  return (
    <SymbolView
      {...(Platform.OS === 'web'
        ? { 'aria-hidden': true }
        : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' })}
      name={name}
      size={size}
      tintColor="#2dd4bf"
    />
  );
}

function SectionHeading({ title, icon }: { title: string; icon: AnalyticsIconName }) {
  return (
    <View className="flex-row items-center gap-2">
      <AnalyticsIcon name={icon} size={19} />
      <Text className="text-lg font-bold text-white">{title}</Text>
    </View>
  );
}

function Metric({ label, value, icon, compact = false }: {
  label: string;
  value: string;
  icon: AnalyticsIconName;
  compact?: boolean;
}) {
  return (
    <View className={`min-h-24 min-w-0 flex-1 justify-between rounded-xl border border-slate-800 bg-slate-900 ${compact ? 'p-3' : 'p-4'}`}>
      <View className="flex-row items-center gap-1.5">
        <AnalyticsIcon name={icon} size={compact ? 13 : 16} />
        <Text
          className={`${compact ? 'text-[10px] tracking-wide' : 'text-xs tracking-wider'} flex-1 uppercase text-slate-400`}
          numberOfLines={compact ? 2 : undefined}
        >
          {label}
        </Text>
      </View>
      <Text
        className={`${compact ? 'text-base' : 'text-xl'} font-bold text-white`}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
    </View>
  );
}

function TrendChart({ trends }: { trends: AnalyticsTrend[] }) {
  const [width, setWidth] = useState(0);
  const height = 220;
  const left = 38;
  const right = 38;
  const top = 18;
  const bottom = 28;
  const plotWidth = Math.max(0, width - left - right);
  const plotHeight = height - top - bottom;
  const maxScore = Math.max(1, ...trends.flatMap((item) => [item.userScore, item.globalAverage]));
  const ranks = trends.flatMap((item) => item.rank == null ? [] : [item.rank]);
  const minRank = ranks.length ? Math.min(...ranks) : 1;
  const maxRank = ranks.length ? Math.max(...ranks) : 5;
  const x = (index: number) => left + (trends.length <= 1 ? plotWidth / 2 : index * plotWidth / (trends.length - 1));
  const scoreY = (value: number) => top + (1 - value / maxScore) * plotHeight;
  const rankY = (value: number) => top + ((value - minRank) / Math.max(1, maxRank - minRank)) * plotHeight;
  const linePath = (getY: (row: AnalyticsTrend) => number | null) => {
    let path = '';
    trends.forEach((row, index) => {
      const y = getY(row);
      if (y === null) return;
      path += `${path ? ' L' : 'M'} ${x(index)} ${y}`;
    });
    return path;
  };
  const labelIndexes = [...new Set([0, Math.floor((trends.length - 1) / 2), trends.length - 1])];

  return (
    <View
      accessibilityLabel="Gameweek trajectory chart: your score and global average in points, with global rank"
      className="h-[220px] w-full"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Svg
          {...(Platform.OS === 'web'
            ? { 'aria-hidden': true }
            : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' })}
          height={height}
          width={width}
        >
          {[0, 0.5, 1].map((fraction) => {
            const y = top + fraction * plotHeight;
            return <Line key={fraction} x1={left} x2={width - right} y1={y} y2={y} stroke="#475569" strokeDasharray="4 4" />;
          })}
          <SvgText x={left - 5} y={top + 4} fill="#94a3b8" fontSize="9" textAnchor="end">{maxScore.toFixed(0)}</SvgText>
          <SvgText x={left - 5} y={top + plotHeight} fill="#94a3b8" fontSize="9" textAnchor="end">0</SvgText>
          {ranks.length ? (
            <>
              <SvgText x={width - right + 5} y={top + 4} fill="#fbbf24" fontSize="9">#{minRank}</SvgText>
              <SvgText x={width - right + 5} y={top + plotHeight} fill="#fbbf24" fontSize="9">#{maxRank}</SvgText>
            </>
          ) : null}
          <Path d={linePath((row) => scoreY(row.userScore))} fill="none" stroke="#22d3ee" strokeWidth="3" />
          <Path d={linePath((row) => scoreY(row.globalAverage))} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />
          <Path d={linePath((row) => row.rank == null ? null : rankY(row.rank))} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
          {trends.map((row, index) => (
            <Circle key={`${row.gameweekId}-score`} cx={x(index)} cy={scoreY(row.userScore)} r={3.5} fill="#22d3ee" />
          ))}
          {labelIndexes.map((index) => (
            <SvgText key={index} x={x(index)} y={height - 6} fill="#94a3b8" fontSize="9" textAnchor="middle">
              GW {trends[index].gameweekId}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

function RoleScoringChart({ roles }: { roles: AnalyticsRole[] }) {
  const maxPoints = Math.max(1, ...roles.map((item) => item.points));
  return (
    <View className="gap-4">
      {roles.map((item, index) => (
        <View key={item.role} className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-300">{item.role}</Text>
            <Text className="text-sm font-semibold tabular-nums text-white">{item.points.toFixed(1)} pts</Text>
          </View>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`${item.role} points`}
            accessibilityValue={{ min: 0, max: maxPoints, now: item.points }}
            className="h-3 overflow-hidden rounded-full bg-slate-800"
          >
            <View
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, item.points / maxPoints * 100))}%`, backgroundColor: roleColors[index % roleColors.length] }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function getDreamTeamLineup(players: AnalyticsPlayer[]) {
  const remaining = [...players];
  const roles = ['Carry', 'Mid', 'Offlane', 'Support', 'Hard Support'];
  const starters = roles.flatMap((role) => {
    const index = remaining.findIndex((player) => player.role === role);
    return index < 0 ? [] : remaining.splice(index, 1);
  });
  return { starters, bench: remaining.sort((a, b) => b.points - a.points) };
}

export default function AnalyticsScreen() {
  const [tab, setTab] = useState<'my' | 'market' | 'dream'>('my');
  const [trendRange, setTrendRange] = useState<AnalyticsTrendRange>('all');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const query = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
    staleTime: 60_000,
  });
  const visibleTrend = getAnalyticsTrendForRange(query.data?.trend ?? [], trendRange);
  const maxTrend = Math.max(1, ...visibleTrend.map((item) => item.userScore));

  async function exportAnalyticsCsv() {
    const analytics = query.data;
    if (!analytics || exportingCsv) return;
    setExportingCsv(true);
    setExportFeedback(null);
    try {
      const csv = serializeAnalyticsCsv(analytics);
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `fantasy-analytics-${date}.csv`;

      if (Platform.OS === 'web') {
        let objectUrl: string | null = null;
        let link: HTMLAnchorElement | null = null;
        try {
          objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
          link = document.createElement('a');
          link.href = objectUrl;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
        } finally {
          link?.remove();
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
      } else {
        if (!await Sharing.isAvailableAsync()) {
          throw new Error('CSV sharing is unavailable on this device.');
        }
        const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
        if (!directory) throw new Error('A temporary file location is unavailable.');
        const fileUri = `${directory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
          dialogTitle: 'Export fantasy analytics',
        });
      }

      setExportFeedback({
        type: 'success',
        message: Platform.OS === 'web' ? 'Analytics CSV downloaded.' : 'Analytics CSV ready to share or save.',
      });
    } catch (error) {
      setExportFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to export analytics.',
      });
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#14b8a6" />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Your season</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Analytics</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Review your fantasy results, role contributions, captaincy, and player value.
          </Text>
        </View>
        <Link href="/premium" asChild>
          <Pressable accessibilityRole="button" className="min-h-10 self-start justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3">
            <Text className="text-sm font-semibold text-amber-300">Explore Premium Tools →</Text>
          </Pressable>
        </Link>

        {query.isPending ? (
          <View accessibilityLabel="Loading analytics" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Analytics unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load your analytics.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="flex-row gap-3">
              <Metric
                label="Total points"
                value={query.data.user.totalPoints.toLocaleString()}
                icon={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
              />
              <Metric
                label="Global rank"
                value={query.data.user.globalRank ? `#${query.data.user.globalRank}` : '—'}
                icon={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }}
              />
            </View>
            <View className="flex-row gap-3">
              <Metric
                compact
                label="Squad value"
                value={`$${(query.data.user.squadValue / 10).toFixed(1)}M`}
                icon={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
              />
              <Metric
                compact
                label="Budget"
                value={`$${query.data.user.budget.toFixed(1)}M`}
                icon={{ ios: 'dollarsign.circle.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
              />
              <Metric
                compact
                label="Free transfers"
                value={String(query.data.user.freeTransfers)}
                icon={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
              />
            </View>

            <View
              accessibilityRole="tablist"
              accessibilityLabel="Analytics views"
              className="flex-row flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2"
            >
              {([
                ['my', 'My Performance', query.data.trend.length],
                ['market', 'Market', Math.min(query.data.market.length, 6)],
                ['dream', 'Dream Team', query.data.dreamTeam.length],
              ] as const).map(([key, label, count]) => (
                <Pressable
                  key={key}
                  nativeID={`analytics-tab-${key}`}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: tab === key }}
                  style={{ flexGrow: key === 'my' ? 1.5 : 1 }}
                  className={`min-h-10 flex-1 items-center justify-center rounded-xl px-4 ${
                    tab === key ? 'bg-brand-500' : ''
                  }`}
                  onPress={() => setTab(key)}
                >
                  <View className="flex-row items-center gap-2">
                    <Text className={`text-xs font-semibold ${tab === key ? 'text-on-accent' : 'text-slate-300'}`}>{label}</Text>
                    <Text className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      tab === key ? 'bg-slate-950/15 text-on-accent' : 'bg-slate-800 text-slate-400'
                    }`}>{count}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View className="gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export all analytics data as CSV"
                disabled={exportingCsv}
                className="min-h-10 items-center justify-center self-start rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 disabled:opacity-50"
                onPress={() => void exportAnalyticsCsv()}
              >
                <Text className="text-xs font-semibold text-brand-300">
                  {exportingCsv ? 'Preparing CSV...' : 'Export Analytics CSV'}
                </Text>
              </Pressable>
              {exportFeedback ? (
                <Text
                  accessibilityRole={exportFeedback.type === 'error' ? 'alert' : 'text'}
                  className={`text-xs ${exportFeedback.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}
                >
                  {exportFeedback.message}
                </Text>
              ) : null}
            </View>

            {tab === 'my' ? (
              <View
                role="tabpanel"
                accessibilityLabel="My Performance"
                accessibilityLabelledBy="analytics-tab-my"
                className="gap-5"
              >
              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <View className="gap-3">
                <SectionHeading
                  title="Gameweek trajectory"
                  icon={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
                />
                <Text className="text-xs leading-5 text-slate-400">
                  Your performance vs global average and global rank across gameweeks.
                </Text>
                <View className="flex-row flex-wrap gap-x-4 gap-y-2">
                  {[
                    ['#22d3ee', 'Your score'],
                    ['#94a3b8', 'Global average'],
                    ['#f59e0b', 'Global rank'],
                  ].map(([color, label]) => (
                    <View key={label} className="flex-row items-center gap-1.5">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <Text className="text-xs text-slate-300">{label}</Text>
                    </View>
                  ))}
                </View>
                <View accessibilityRole="tablist" accessibilityLabel="Gameweek trend range" className="flex-row gap-2">
                  {([
                    ['3', 'Last 3'],
                    ['6', 'Last 6'],
                    ['all', 'All'],
                  ] as const).map(([range, label]) => (
                    <Pressable
                      key={range}
                      accessibilityRole="button"
                      accessibilityLabel={`${label} gameweeks`}
                      accessibilityState={{ selected: trendRange === range }}
                      className={`min-h-10 flex-1 items-center justify-center rounded-lg border px-2 ${
                        trendRange === range ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-950'
                      }`}
                      onPress={() => setTrendRange(range)}
                    >
                      <Text className={`text-xs font-semibold ${trendRange === range ? 'text-brand-300' : 'text-slate-300'}`}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {visibleTrend.length ? (
                <>
                  <TrendChart trends={visibleTrend} />
                  <View
                    accessible
                    accessibilityRole="header"
                    accessibilityLabel="Columns: Gameweek, Your score, Global average, Global rank"
                    className="flex-row border-b border-slate-700 pb-2"
                  >
                    <Text className="flex-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Gameweek</Text>
                    <Text className="w-16 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Score</Text>
                    <Text className="w-16 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Avg</Text>
                    <Text className="w-16 text-right text-xs font-semibold uppercase tracking-wide text-amber-400">Rank</Text>
                  </View>
                  {visibleTrend.map((trend) => (
                    <View key={trend.gameweekId} className="gap-2 border-b border-slate-800 py-3">
                      <View
                        accessible
                        accessibilityLabel={`Gameweek ${trend.gameweekId}. Your score ${trend.userScore.toFixed(1)} points. Global average ${trend.globalAverage.toFixed(1)} points. Global rank ${trend.rank != null ? `#${trend.rank}` : 'unranked'}.`}
                        className="flex-row items-center"
                      >
                        <Text className="flex-1 text-sm text-slate-300">GW {trend.gameweekId}</Text>
                        <Text className="w-16 text-right text-sm font-semibold tabular-nums text-white">
                          {trend.userScore.toFixed(1)}
                        </Text>
                        <Text className="w-16 text-right text-sm tabular-nums text-slate-400">
                          {trend.globalAverage.toFixed(1)}
                        </Text>
                        <Text className="w-16 text-right text-sm font-medium tabular-nums text-amber-400">
                          {trend.rank != null ? `#${trend.rank}` : '—'}
                        </Text>
                      </View>
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        className="h-2 overflow-hidden rounded-full bg-slate-800"
                      >
                        <View
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width: `${Math.min(100, Math.max(2, (trend.userScore / maxTrend) * 100))}%` }}
                        />
                      </View>
                    </View>
                  ))}
                </>
              ) : <Text className="text-sm text-slate-400">No gameweek scores are available yet.</Text>}
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <SectionHeading
                title="Captain efficiency"
                icon={{ ios: 'scope', android: 'gps_fixed', web: 'gps_fixed' }}
              />
              {(() => {
                const assessment = getCaptainEfficiencyAssessment(query.data.captainEfficiency.efficiency);
                const normalizedEfficiency = Math.min(100, Math.max(0, query.data.captainEfficiency.efficiency));
                return (
                  <>
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="text-sm text-slate-400">Efficiency</Text>
                      <View className="flex-row items-center gap-2">
                        <Text className={`text-lg font-bold ${assessment.color}`}>
                          {query.data.captainEfficiency.efficiency.toFixed(1)}%
                        </Text>
                        <Text className={`rounded-full border border-slate-700 px-2 py-1 text-xs font-semibold ${assessment.color}`}>
                          {assessment.label}
                        </Text>
                      </View>
                    </View>
                    <View
                      accessible
                      accessibilityRole="progressbar"
                      accessibilityLabel={`Captain efficiency: ${assessment.label}`}
                      accessibilityValue={{ min: 0, max: 100, now: normalizedEfficiency }}
                      className="h-2.5 overflow-hidden rounded-full bg-slate-800"
                    >
                      <View className={`h-full ${assessment.label === 'Good' ? 'bg-emerald-400' : assessment.label === 'Average' ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${normalizedEfficiency}%` }} />
                    </View>
                    <Text className={`text-xs ${assessment.color}`}>
                      {assessment.description} · Good ≥80%, Average ≥50%, Poor below 50%
                    </Text>
                  </>
                );
              })()}
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-400">Captain points / ideal</Text>
                <Text className="font-semibold text-white">
                  {query.data.captainEfficiency.captainPoints.toFixed(1)} / {query.data.captainEfficiency.idealCapPoints.toFixed(1)}
                </Text>
              </View>
            </View>

            <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <SectionHeading
                title="Role scoring breakdown"
                icon={{ ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' }}
              />
              <Text className="text-xs text-slate-400">Distribution of total fantasy points earned by position.</Text>
              {query.data.roleBreakdown.length
                ? <RoleScoringChart roles={query.data.roleBreakdown} />
                : <Text className="text-sm text-slate-400">No role breakdown data available yet.</Text>}
            </View>

              </View>
            ) : null}

            {tab === 'dream' ? (
              <View
                role="tabpanel"
                accessibilityLabel="Dream Team"
                accessibilityLabelledBy="analytics-tab-dream"
                className="gap-5"
              >
              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <SectionHeading
                  title="Gameweek dream team"
                  icon={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }}
                />
                <Text className="text-xs leading-5 text-slate-400">Best role-balanced scorers from the latest available gameweek.</Text>
                {query.data.dreamTeam.length ? (() => {
                  const { starters, bench } = getDreamTeamLineup(query.data.dreamTeam);
                  return (
                    <>
                      <View className="overflow-hidden rounded-2xl border border-emerald-700/50 bg-emerald-950 p-3">
                        <View className="absolute inset-2 rounded-xl border border-white/15" />
                        <View className="absolute bottom-1/2 left-3 right-3 h-px bg-white/10" />
                        <View className="flex-row flex-wrap justify-center gap-2">
                          {starters.map((player) => {
                            const market = query.data.market.find((item) =>
                              item.playerName === player.playerName &&
                              item.team === player.team &&
                              item.role === player.role
                            );
                            return (
                              <View key={`${player.playerName}-${player.role}`} className="min-h-28 w-[30%] justify-center rounded-xl border border-white/20 bg-slate-950/80 p-2">
                                <Text className="text-center text-[9px] font-bold uppercase text-emerald-200">{player.role}</Text>
                                <Text numberOfLines={1} className="mt-1 text-center text-xs font-bold text-white">{player.playerName}</Text>
                                <Text numberOfLines={1} className="mt-0.5 text-center text-[9px] text-slate-300">{player.team}</Text>
                                <Text className="mt-1 text-center text-sm font-black text-amber-300">{player.points.toFixed(1)} pts</Text>
                                <Text className="mt-0.5 text-center text-[9px] text-slate-300">
                                  {market ? `$${market.price.toFixed(1)}M · ${market.roi.toFixed(1)} pts / $10M` : 'Price unavailable'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                      {bench.length ? (
                        <View className="gap-2">
                          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">Bench</Text>
                          {bench.map((player, index) => {
                            const market = query.data.market.find((item) =>
                              item.playerName === player.playerName &&
                              item.team === player.team &&
                              item.role === player.role
                            );
                            return (
                              <View key={`${player.playerName}-${index}`} className="flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                                <View className="flex-1">
                                  <Text className="text-[10px] font-bold uppercase text-slate-400">Bench {index + 1} · {player.role}</Text>
                                  <Text numberOfLines={1} className="mt-1 font-semibold text-white">{player.playerName}</Text>
                                  <Text className="mt-1 text-[10px] text-slate-400">
                                    {market ? `$${market.price.toFixed(1)}M · ${market.roi.toFixed(1)} pts / $10M` : 'Price unavailable'}
                                  </Text>
                                </View>
                                <Text className="font-bold text-amber-300">{player.points.toFixed(1)} pts</Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                    </>
                  );
                })() : <Text className="text-sm text-slate-400">Dream Team results will appear after gameweek scoring is available.</Text>}
              </View>

              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <SectionHeading
                  title="Top individual performances"
                  icon={{ ios: 'star.fill', android: 'grade', web: 'grade' }}
                />
                <Text className="text-xs text-slate-400">Standout scoring and value signals.</Text>
                {query.data.valueForMoney.length ? query.data.valueForMoney.slice(0, 5).map((player, index) => (
                  <View key={`${player.playerName}-${index}`} className="gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-bold text-white">{player.playerName}</Text>
                        <Text className="mt-1 text-xs text-slate-400">{player.team}</Text>
                      </View>
                      <Text className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-sm font-bold text-amber-300">{player.roi.toFixed(1)} ROI</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{player.role}</Text>
                      <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">${player.price.toFixed(1)}M</Text>
                      <Text className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{player.ownership.toFixed(1)}% owned</Text>
                    </View>
                  </View>
                )) : <Text className="text-sm text-slate-400">No standout performances are available yet.</Text>}
              </View>
              </View>
            ) : null}

            {tab === 'market' ? (
              <View
                role="tabpanel"
                accessibilityLabel="Market"
                accessibilityLabelledBy="analytics-tab-market"
                className="gap-5"
              >
                <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <SectionHeading
                    title="Value for money"
                    icon={{ ios: 'dollarsign.circle.fill', android: 'paid', web: 'paid' }}
                  />
                  <Text className="text-xs text-slate-400">High-return players by points per $10M.</Text>
                  {query.data.market.length ? query.data.market.slice(0, 6).map((player, index) => (
                    <View key={`${player.playerName}-${index}`} className="gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="font-bold text-white">{player.playerName}</Text>
                          <Text className="mt-1 text-xs text-slate-400">{player.team}</Text>
                        </View>
                        <Text className="shrink-0 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">{player.role}</Text>
                      </View>
                      <View className="flex-row justify-between border-t border-slate-800 pt-3">
                        <View>
                          <Text className="text-[10px] uppercase tracking-wider text-slate-500">Price</Text>
                          <Text className="mt-1 text-sm font-semibold text-white">${player.price.toFixed(1)}M</Text>
                        </View>
                        <View>
                          <Text className="text-[10px] uppercase tracking-wider text-slate-500">Owned</Text>
                          <Text className="mt-1 text-sm font-semibold text-white">{player.ownership.toFixed(1)}%</Text>
                        </View>
                        <View>
                          <Text className="text-[10px] uppercase tracking-wider text-slate-500">ROI</Text>
                          <Text className="mt-1 text-sm font-bold text-emerald-300">{player.roi.toFixed(2)}</Text>
                        </View>
                      </View>
                    </View>
                  )) : <Text className="text-sm text-slate-400">Market insights will appear when player data is available.</Text>}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
