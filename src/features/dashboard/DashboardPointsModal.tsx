import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getDashboardPointsBreakdown } from '@/src/features/fantasy/api';
import { POINT_CATEGORIES } from '@/src/features/fantasy/points-breakdown';
import { useMobileTheme } from '@/src/lib/theme';

interface DashboardPointsModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatPoints(points: number): string {
  return `${points > 0 ? '+' : ''}${points.toFixed(2)}`;
}

export function DashboardPointsModal({ visible, onClose }: DashboardPointsModalProps) {
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const colors = {
    surface: isDark ? '#0f172a' : '#ffffff',
    raisedSurface: isDark ? '#020617' : '#f1f5f9',
    border: isDark ? '#334155' : '#cbd5e1',
    divider: isDark ? '#1e293b' : '#e2e8f0',
    primaryText: isDark ? '#f8fafc' : '#0f172a',
    secondaryText: isDark ? '#cbd5e1' : '#334155',
    mutedText: isDark ? '#94a3b8' : '#64748b',
    closeBackground: isDark ? '#1e293b' : '#e2e8f0',
    backdrop: isDark ? 'rgba(2, 6, 23, 0.82)' : 'rgba(15, 23, 42, 0.55)',
    successSurface: isDark ? 'rgba(16, 185, 129, 0.06)' : '#ecfdf5',
    errorSurface: isDark ? 'rgba(69, 10, 10, 0.5)' : '#fef2f2',
    categorySurface: isDark ? 'rgba(2, 6, 23, 0.4)' : '#f8fafc',
  };
  const [expandedGameweekId, setExpandedGameweekId] = useState<number | null | undefined>(undefined);
  const breakdownQuery = useQuery({
    queryKey: ['dashboard-points-breakdown'],
    queryFn: getDashboardPointsBreakdown,
    enabled: visible,
    staleTime: 60_000,
  });
  const breakdown = breakdownQuery.data;
  const initialGameweekId = breakdown?.gameweeks[0]?.gameweekId ?? null;
  const expandedId = expandedGameweekId === undefined ? initialGameweekId : expandedGameweekId;

  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        className="flex-1 justify-end"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          justifyContent: 'flex-end',
          backgroundColor: colors.backdrop,
        }}
      >
        <View
          className="overflow-hidden rounded-t-3xl border border-slate-700 bg-slate-900"
          style={{
            width: '100%',
            height: '92%',
            maxHeight: '92%',
            flex: 1,
            alignSelf: 'stretch',
            overflow: 'hidden',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <View className="flex-row items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: colors.divider }}>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-amber-300">Season points</Text>
              <Text accessibilityRole="header" className="mt-1 text-xl font-bold" style={{ color: colors.primaryText }}>
                Where your points came from
              </Text>
              {breakdown?.seasonName ? <Text className="mt-1 text-sm" style={{ color: colors.mutedText }}>{breakdown.seasonName}</Text> : null}
            </View>
            <Pressable
              accessibilityLabel="Close total points breakdown"
              accessibilityRole="button"
              className="min-h-11 min-w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.closeBackground }}
              onPress={onClose}
            >
              <Text className="text-xl" style={{ color: colors.secondaryText }}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            className="px-5"
            style={{ flex: 1, minHeight: 0 }}
            contentContainerClassName="gap-6 py-5"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, gap: 24 }}
          >
            {breakdownQuery.isPending ? (
              <View accessibilityLabel="Loading points breakdown" className="min-h-40 items-center justify-center gap-3">
                <ActivityIndicator color="#fbbf24" />
                <Text className="text-sm" style={{ color: colors.secondaryText }}>Loading your score details…</Text>
              </View>
            ) : breakdownQuery.isError ? (
                <View accessibilityRole="alert" className="gap-3 rounded-xl border p-4" style={{ backgroundColor: colors.errorSurface, borderColor: isDark ? '#7f1d1d' : '#fecaca' }}>
                  <Text className="text-sm leading-5" style={{ color: isDark ? '#fecaca' : '#991b1b' }}>
                  {breakdownQuery.error instanceof Error
                    ? breakdownQuery.error.message
                    : 'Unable to load your points breakdown.'}
                </Text>
                <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start" onPress={() => void breakdownQuery.refetch()}>
                  <Text className="font-semibold" style={{ color: colors.primaryText }}>Try again</Text>
                </Pressable>
              </View>
            ) : breakdown ? (
              <>
                <View className="rounded-xl border border-emerald-500/25 p-4" style={{ backgroundColor: colors.successSurface }}>
                  <Text className="text-xs uppercase tracking-wider" style={{ color: colors.mutedText }}>Season total</Text>
                  <Text
                    className="mt-1 text-3xl font-bold"
                    style={{ color: isDark ? '#6ee7b7' : '#047857' }}
                  >
                    {breakdown.totalPoints.toFixed(2)} pts
                  </Text>
                  <Text className="mt-2 text-xs leading-5" style={{ color: colors.mutedText }}>
                    The saved total includes gameweek lineup scores, captain multipliers, and applicable chips.
                  </Text>
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold uppercase tracking-wider" style={{ color: colors.secondaryText }}>Scoring categories</Text>
                  {POINT_CATEGORIES.map(([key, label]) => (
                    <View key={key} className="flex-row items-center justify-between gap-3 rounded-lg border px-3 py-2.5" style={{ backgroundColor: colors.categorySurface, borderColor: colors.divider }}>
                      <Text className="text-sm" style={{ color: colors.secondaryText }}>{label}</Text>
                      <Text className="text-sm font-semibold" style={{ color: colors.primaryText }}>{formatPoints(breakdown.categoryTotals[key])} pts</Text>
                    </View>
                  ))}
                  {Math.abs(breakdown.unitemizedPoints) >= 0.01 ? (
                    <View className="gap-1 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="text-sm text-amber-200">Unitemized difference</Text>
                        <Text className="text-sm font-semibold text-amber-100">{formatPoints(breakdown.unitemizedPoints)} pts</Text>
                      </View>
                      <Text className="text-xs leading-4 text-slate-400">
                        Historical scoring details may be unavailable for this portion of the saved total.
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold uppercase tracking-wider" style={{ color: colors.secondaryText }}>Gameweek contributions</Text>
                  {breakdown.gameweeks.length === 0 ? (
                    <Text className="rounded-xl border p-4 text-sm" style={{ color: colors.secondaryText, backgroundColor: colors.categorySurface, borderColor: colors.border }}>
                      No saved gameweek lineups are available yet.
                    </Text>
                  ) : (
                    breakdown.gameweeks.map((gameweek) => {
                      const expanded = expandedId === gameweek.gameweekId;
                      return (
                        <View key={gameweek.gameweekId} className="overflow-hidden rounded-xl border" style={{ backgroundColor: colors.categorySurface, borderColor: colors.divider }}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ expanded }}
                            className="min-h-14 flex-row items-center justify-between gap-3 p-4"
                            onPress={() => setExpandedGameweekId(expanded ? null : gameweek.gameweekId)}
                          >
                            <Text className="font-semibold" style={{ color: colors.primaryText }}>Gameweek {gameweek.gameweekNumber}</Text>
                            <View className="flex-row items-center gap-2">
                              {gameweek.benchBoost ? (
                                <Text className="rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-bold uppercase text-violet-200">
                                  Bench Boost
                                </Text>
                              ) : null}
                              <Text className="text-sm font-bold text-emerald-300">{gameweek.points.toFixed(2)} pts</Text>
                            </View>
                          </Pressable>
                          {expanded ? (
                            <View className="border-t px-4 pb-2" style={{ borderColor: colors.divider }}>
                              {gameweek.contributors.length === 0 ? (
                                <Text className="py-3 text-sm" style={{ color: colors.mutedText }}>
                                  No player scoring details are available for this gameweek.
                                </Text>
                              ) : gameweek.contributors.map((player) => (
                                <View key={`${gameweek.gameweekId}-${player.playerId}`} className="flex-row items-center justify-between gap-3 border-b py-3" style={{ borderColor: colors.divider }}>
                                  <View className="flex-1">
                                    <Text className="font-medium" style={{ color: colors.primaryText }}>{player.name}</Text>
                                    <Text className="mt-1 text-xs" style={{ color: colors.mutedText }}>
                                      {player.role} · {player.basePoints.toFixed(2)} base pts
                                      {player.isAutoSub ? ' · Auto-sub' : ''}
                                      {player.isCaptain ? ` · Captain ${player.multiplier}x` : ''}
                                      {!player.isCaptain && player.isViceCaptain && player.multiplier > 1
                                        ? ` · Vice-captain ${player.multiplier}x`
                                        : ''}
                                    </Text>
                                  </View>
                                  <Text className="text-sm font-semibold text-emerald-300">{player.points.toFixed(2)} pts</Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
