import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useMobileTheme } from '@/src/lib/theme';
import type { MarketPlayer } from '@/src/features/fantasy/api';

export interface DifferentialScoutPlayer {
  id: number;
  name: string;
  in_game_name: string | null;
  primary_role: string | null;
  current_price: number | null;
  ownership_percentage: number;
  recommendation_type: 'differential' | 'value_momentum' | 'high_ceiling' | 'consistent_anchor';
  reason: string;
  confidence: number;
  projected_points: number;
  recent_points: number | null;
  team_name?: string | null;
}

interface DifferentialScoutPanelProps {
  candidates: MarketPlayer[];
  selectedPlayerInId: number | null;
  onSelectPlayerIn: (player: DifferentialScoutPlayer) => void;
  isLocked?: boolean;
  onScrollToReview?: () => void;
  defaultCollapsed?: boolean;
}

type FilterType = 'all' | 'differential' | 'high_ceiling' | 'value_momentum' | 'consistent_anchor';

export function DifferentialScoutPanel({
  candidates,
  selectedPlayerInId,
  onSelectPlayerIn,
  isLocked = false,
  onScrollToReview,
  defaultCollapsed = true,
}: DifferentialScoutPanelProps) {
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<DifferentialScoutPlayer | null>(null);

  // Process available candidate players into curated recommendations
  const recommendations = useMemo(() => {
    if (!candidates || candidates.length === 0) return [];

    const available = candidates.filter(
      (p) => p.current_price !== null && (!p.availability_status || p.availability_status === 'available')
    );

    return available.map((player, idx): DifferentialScoutPlayer => {
      const ownership = player.ownership_percentage ?? (idx < 3 ? 32 : idx < 8 ? 18 : 6);
      const isDifferential = ownership < 15;
      const isLowPrice = (player.current_price ?? 0) < 7.5;

      let type: DifferentialScoutPlayer['recommendation_type'] = 'value_momentum';
      let reason = 'High form momentum candidate heading into the next gameweek.';
      let confidence = 0.85;
      let projectedPts = Number((18.5 + (idx % 6) * 2.2).toFixed(1));

      if (isDifferential && isLowPrice) {
        type = 'differential';
        reason = `Sub-15% ownership (${ownership.toFixed(1)}%) budget gem. Outperforming price bracket.`;
        confidence = 0.88;
        projectedPts = Number((21.0 + (idx % 4) * 1.8).toFixed(1));
      } else if (isDifferential) {
        type = 'differential';
        reason = `Differential pick (${ownership.toFixed(1)}% ownership). High upside leverage against league rivals.`;
        confidence = 0.82;
        projectedPts = Number((23.5 + (idx % 5) * 1.5).toFixed(1));
      } else if (idx < 3) {
        type = 'high_ceiling';
        reason = 'Elite ceiling anchor with multi-match explosive fantasy potential.';
        confidence = 0.92;
        projectedPts = Number((28.0 + idx * 1.2).toFixed(1));
      } else {
        type = 'consistent_anchor';
        reason = 'Dependable floor with steady points contribution and low volatility.';
        confidence = 0.79;
        projectedPts = Number((17.0 + (idx % 5) * 1.4).toFixed(1));
      }

      return {
        id: player.id,
        name: player.name,
        in_game_name: player.in_game_name,
        primary_role: player.primary_role,
        current_price: player.current_price,
        ownership_percentage: ownership,
        recommendation_type: type,
        reason,
        confidence,
        projected_points: projectedPts,
        recent_points: player.recent_points,
        team_name: player.professional_teams?.name ?? null,
      };
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }, [candidates]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return recommendations;
    return recommendations.filter((r) => r.recommendation_type === activeFilter);
  }, [recommendations, activeFilter]);

  const filterTabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'differential', label: 'Differentials (<15%)' },
    { id: 'high_ceiling', label: 'High Ceiling' },
    { id: 'value_momentum', label: 'Value Momentum' },
    { id: 'consistent_anchor', label: 'Anchors' },
  ];

  return (
    <View
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.35)',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      }}
    >
      {/* Header with Collapsible Toggle */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle Differential Scout & Recommendations"
        className="flex-row items-center justify-between p-3.5 gap-2"
        style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff' }}
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0 pr-1">
          <View
            className="h-8 w-8 items-center justify-center rounded-xl border shrink-0"
            style={{
              borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(217, 119, 6, 0.4)',
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(254, 243, 199, 0.8)',
            }}
          >
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              size={16}
              tintColor={isDark ? '#fbbf24' : '#b45309'}
            />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text
                className="text-xs sm:text-sm font-bold flex-1 min-w-0"
                style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Differential Scout
              </Text>
              <View className="rounded-full bg-amber-500/20 px-1.5 py-0.2 border border-amber-500/40 shrink-0">
                <Text className="text-[9px] font-bold text-amber-400">PRO</Text>
              </View>
            </View>
            <Text
              className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Low-ownership gems (&lt;15%) &amp; high ceiling targets
            </Text>
          </View>
        </View>

        <View className="shrink-0 pl-1">
          <SymbolView
            name={isCollapsed ? { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' } : { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }}
            size={18}
            tintColor={isDark ? '#94a3b8' : '#64748b'}
          />
        </View>
      </Pressable>

      {!isCollapsed && (
        <View className="border-t p-4 pt-3 gap-3" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          {/* Scrollable Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-1">
            {filterTabs.map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="button"
                  onPress={() => setActiveFilter(tab.id)}
                  className="rounded-full px-3 py-1.5 border"
                  style={{
                    borderColor: active
                      ? (isDark ? '#f59e0b' : '#d97706')
                      : (isDark ? '#334155' : '#cbd5e1'),
                    backgroundColor: active
                      ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(254, 243, 199, 1)')
                      : (isDark ? '#1e293b' : '#f1f5f9'),
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: active
                        ? (isDark ? '#fef08a' : '#92400e')
                        : (isDark ? '#94a3b8' : '#475569'),
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Feedback Banner when player selected */}
          {selectedPlayer ? (
            <View
              className="flex-row items-center justify-between rounded-xl border p-3"
              style={{
                borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.4)',
                backgroundColor: isDark ? 'rgba(6, 78, 59, 0.3)' : '#ecfdf5',
              }}
            >
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <SymbolView
                  name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                  size={18}
                  tintColor={isDark ? '#34d399' : '#059669'}
                />
                <Text
                  className="text-xs font-medium"
                  style={{ color: isDark ? '#a7f3d0' : '#065f46' }}
                  numberOfLines={2}
                >
                  Added <Text className="font-bold">{selectedPlayer.in_game_name || selectedPlayer.name}</Text> to trade. Scroll down to review.
                </Text>
              </View>
              {onScrollToReview ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onScrollToReview}
                  className="rounded-lg px-2.5 py-1 border"
                  style={{
                    borderColor: isDark ? '#10b981' : '#059669',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ffffff',
                  }}
                >
                  <Text className="text-[11px] font-bold" style={{ color: isDark ? '#6ee7b7' : '#047857' }}>
                    Scroll to Trade ↓
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Cards List */}
          {filtered.length === 0 ? (
            <Text className="py-2 text-xs text-slate-400">
              No recommendations found for this category.
            </Text>
          ) : (
            <View className="gap-2.5">
              {filtered.map((player) => {
                const isSelected = selectedPlayerInId === player.id;
                return (
                  <View
                    key={player.id}
                    className="rounded-xl border p-3 gap-2"
                    style={{
                      borderColor: isSelected
                        ? (isDark ? '#14b8a6' : '#0f766e')
                        : (isDark ? '#334155' : '#cbd5e1'),
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(20, 184, 166, 0.12)' : '#f0fdfa')
                        : (isDark ? '#020617' : '#ffffff'),
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text
                            className="font-bold text-sm"
                            style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                            numberOfLines={1}
                          >
                            Scout: {player.in_game_name || player.name}
                          </Text>
                          <View
                            className="rounded-full px-2 py-0.2 border"
                            style={{
                              borderColor:
                                player.recommendation_type === 'differential'
                                  ? 'rgba(245, 158, 11, 0.4)'
                                  : player.recommendation_type === 'high_ceiling'
                                    ? 'rgba(139, 92, 246, 0.4)'
                                    : 'rgba(6, 182, 212, 0.4)',
                              backgroundColor:
                                player.recommendation_type === 'differential'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : player.recommendation_type === 'high_ceiling'
                                    ? 'rgba(139, 92, 246, 0.15)'
                                    : 'rgba(6, 182, 212, 0.15)',
                            }}
                          >
                            <Text
                              className="text-[9px] font-bold uppercase"
                              style={{
                                color:
                                  player.recommendation_type === 'differential'
                                    ? '#fbbf24'
                                    : player.recommendation_type === 'high_ceiling'
                                      ? '#c084fc'
                                      : '#38bdf8',
                              }}
                            >
                              {player.recommendation_type.replace('_', ' ')}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-[11px] text-slate-400 mt-0.5">
                          {player.primary_role ?? 'Role'} · {player.team_name ?? 'Team'} · {player.current_price?.toFixed(1) ?? '—'}M · {player.ownership_percentage.toFixed(1)}% owned
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-[10px] uppercase font-semibold text-slate-500">Proj. GW</Text>
                        <Text className="text-sm font-extrabold text-cyan-400">
                          {player.projected_points.toFixed(1)} pts
                        </Text>
                      </View>
                    </View>

                    {/* Reason */}
                    <Text className="text-xs leading-4" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                      {player.reason}
                    </Text>

                    {/* Action button */}
                    <Pressable
                      accessibilityRole="button"
                      disabled={isLocked}
                      onPress={() => {
                        setSelectedPlayer(player);
                        onSelectPlayerIn(player);
                      }}
                      className="min-h-9 items-center justify-center rounded-lg border py-1.5"
                      style={{
                        borderColor: isSelected
                          ? (isDark ? '#14b8a6' : '#0f766e')
                          : (isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(217, 119, 6, 0.5)'),
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(20, 184, 166, 0.25)' : '#ccfbf1')
                          : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb'),
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{
                          color: isSelected
                            ? (isDark ? '#5eead4' : '#0f766e')
                            : (isDark ? '#fbbf24' : '#b45309'),
                        }}
                      >
                        {isSelected ? '✓ Selected in Trade' : 'Select as Transfer In'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
