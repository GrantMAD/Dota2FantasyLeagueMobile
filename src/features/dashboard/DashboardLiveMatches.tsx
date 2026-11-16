import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { MatchSummary } from '@/src/features/competition/api';
import { getMatchSquadAppearance } from '@/src/features/competition/match-squad-appearance';
import type { FantasyPlayer } from '@/src/features/fantasy/api';
import { useMobileTheme } from '@/src/lib/theme';

interface DashboardLiveMatchesProps {
  matches: MatchSummary[];
  ownedPlayers?: FantasyPlayer[];
}

export function DashboardLiveMatches({
  matches,
  ownedPlayers = [],
}: DashboardLiveMatchesProps) {
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';

  if (!matches || matches.length === 0) {
    return null;
  }

  const colors = {
    surface: isDark ? '#0f172a' : '#fffafa',
    cardSurface: isDark ? '#1b1b2b' : '#fff7f7',
    confirmedSurface: isDark ? '#10241f' : '#ecfdf5',
    primaryText: isDark ? '#f8fafc' : '#0f172a',
    secondaryText: isDark ? '#cbd5e1' : '#334155',
    mutedText: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? 'rgba(248, 113, 113, 0.35)' : '#fecaca',
    divider: isDark ? 'rgba(248, 113, 113, 0.22)' : '#fee2e2',
    redText: isDark ? '#fca5a5' : '#b91c1c',
    redSurface: isDark ? 'rgba(127, 29, 29, 0.3)' : '#fee2e2',
    radiantText: isDark ? '#6ee7b7' : '#047857',
    radiantSurface: isDark ? 'rgba(6, 78, 59, 0.55)' : '#ecfdf5',
    radiantBorder: isDark ? 'rgba(16, 185, 129, 0.45)' : '#a7f3d0',
    direText: isDark ? '#fda4af' : '#be123c',
    direSurface: isDark ? 'rgba(136, 19, 55, 0.45)' : '#fff1f2',
    direBorder: isDark ? 'rgba(244, 63, 94, 0.4)' : '#fecdd3',
    accentText: isDark ? '#67e8f9' : '#0e7490',
    confirmedText: isDark ? '#a7f3d0' : '#047857',
    confirmedBorder: isDark ? 'rgba(16, 185, 129, 0.45)' : '#a7f3d0',
  };

  return (
    <View
      className="gap-3 rounded-2xl border p-4"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <View className="h-6 w-6 items-center justify-center rounded-lg bg-red-500/15">
            <SymbolView
              name={{ ios: 'dot.radiowaves.left.and.right', android: 'live_tv', web: 'live_tv' }}
              size={15}
              tintColor={colors.redText}
            />
          </View>
          <Text className="shrink text-base font-bold" style={{ color: colors.primaryText }}>
            Live Matches
          </Text>
          <View
            className="rounded-full border px-2 py-0.5"
            style={{ backgroundColor: colors.redSurface, borderColor: colors.border }}
          >
            <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.redText }}>
              {matches.length} Live
            </Text>
          </View>
        </View>

        <Link href="/matches" asChild>
          <Pressable accessibilityRole="button" className="min-h-10 shrink-0 justify-center px-1">
            <Text className="text-xs font-semibold" style={{ color: colors.accentText }}>All Matches ›</Text>
          </Pressable>
        </Link>
      </View>

      <View className="gap-3">
        {matches.map((match) => {
          const radiantName = match.radiant_team?.name ?? 'Radiant';
          const direName = match.dire_team?.name ?? 'Dire';
          const radiantTag = match.radiant_team?.tag ?? 'RAD';
          const direTag = match.dire_team?.tag ?? 'DIR';
          const appearance = getMatchSquadAppearance(match, ownedPlayers);
          const hasSquadConnection = appearance.kind !== 'none';
          const cardStyle = hasSquadConnection
            ? {
                backgroundColor: colors.confirmedSurface,
                borderColor: colors.confirmedBorder,
              }
            : {
                backgroundColor: colors.cardSurface,
                borderColor: colors.border,
              };

          return (
            <Link key={match.id} href={`/match/${match.id}`} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View live match ${radiantName} vs ${direName}`}
                className="w-full gap-3 rounded-xl border p-3.5"
                style={cardStyle}
              >
                <View
                  className="flex-row items-start justify-between gap-2 border-b pb-2"
                  style={{ borderColor: colors.divider }}
                >
                  <Text
                    className="flex-1 text-xs font-semibold"
                    style={{ color: colors.secondaryText, flexShrink: 1 }}
                  >
                    {match.tournament?.name ?? 'Tournament'}
                  </Text>
                  <View className="shrink-0 flex-row items-center gap-1.5">
                    {match.best_of && match.best_of > 0 ? (
                      <Text className="text-[10px] font-mono" style={{ color: colors.mutedText }}>
                        Bo{match.best_of}
                      </Text>
                    ) : null}
                    <View
                      className="flex-row items-center gap-1 rounded border px-1.5 py-0.5"
                      style={{ backgroundColor: colors.redSurface, borderColor: colors.border }}
                    >
                      <View className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <Text className="text-[10px] font-bold font-mono" style={{ color: colors.redText }}>
                        LIVE
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-start justify-between gap-2 py-1">
                  <View className="min-w-0 flex-1 items-start">
                    <View
                      className="mb-1 rounded border px-1.5 py-0.5"
                      style={{ backgroundColor: colors.radiantSurface, borderColor: colors.radiantBorder }}
                    >
                      <Text className="text-[10px] font-bold" style={{ color: colors.radiantText }}>{radiantTag}</Text>
                    </View>
                    <Text
                      className="text-xs font-bold"
                      style={{ color: colors.primaryText, flexShrink: 1 }}
                    >
                      {radiantName}
                    </Text>
                    <Text className="text-[9px] font-mono" style={{ color: colors.radiantText }}>Radiant</Text>
                  </View>

                  <Text className="px-2 text-[11px] font-black" style={{ color: colors.mutedText }}>VS</Text>

                  <View className="min-w-0 flex-1 items-end">
                    <View
                      className="mb-1 rounded border px-1.5 py-0.5"
                      style={{ backgroundColor: colors.direSurface, borderColor: colors.direBorder }}
                    >
                      <Text className="text-[10px] font-bold" style={{ color: colors.direText }}>{direTag}</Text>
                    </View>
                    <Text
                      className="text-right text-xs font-bold"
                      style={{ color: colors.primaryText, flexShrink: 1 }}
                    >
                      {direName}
                    </Text>
                    <Text className="text-right text-[9px] font-mono" style={{ color: colors.direText }}>Dire</Text>
                  </View>
                </View>

                <View
                  className="flex-row flex-wrap items-center justify-between gap-2 border-t pt-2"
                  style={{ borderColor: colors.divider }}
                >
                  {appearance.kind === 'confirmed' ? (
                    <View className="min-w-0 flex-1 flex-row items-center gap-1">
                      <SymbolView
                        name={{ ios: 'shield.fill', android: 'shield', web: 'shield' }}
                        size={11}
                        tintColor={colors.confirmedText}
                      />
                      <Text
                        className="shrink text-[10px] font-semibold"
                        style={{ color: colors.confirmedText }}
                      >
                        {appearance.playerNames.join(', ')} in Action
                      </Text>
                    </View>
                  ) : appearance.kind === 'unconfirmed' ? (
                    <Text className="text-[10px] font-semibold" style={{ color: isDark ? '#fcd34d' : '#b45309' }}>
                      Squad fixture · unconfirmed
                    </Text>
                  ) : (
                    <Text className="text-[10px]" style={{ color: colors.mutedText }}>Live Match Centre</Text>
                  )}
                  <Text className="text-[11px] font-semibold" style={{ color: colors.accentText }}>Details ›</Text>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}
