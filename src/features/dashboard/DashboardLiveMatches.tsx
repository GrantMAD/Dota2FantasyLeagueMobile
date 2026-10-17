import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { MatchSummary } from '@/src/features/competition/api';

interface DashboardLiveMatchesProps {
  matches: MatchSummary[];
  userStarterTeamIds?: number[];
}

export function DashboardLiveMatches({
  matches,
  userStarterTeamIds = [],
}: DashboardLiveMatchesProps) {
  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <View className="gap-3 rounded-2xl border border-red-500/30 bg-slate-900 p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-6 w-6 items-center justify-center rounded-lg bg-red-500/20">
            <SymbolView
              name={{ ios: 'dot.radiowaves.left.and.right', android: 'live_tv', web: 'live_tv' }}
              size={15}
              tintColor="#f87171"
            />
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-white">Live Matches</Text>
              <View className="rounded-full border border-red-500/40 bg-red-500/20 px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                  {matches.length} {matches.length === 1 ? 'Live' : 'Live'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Link href="/matches" asChild>
          <Pressable accessibilityRole="button" className="min-h-10 justify-center px-1">
            <Text className="text-xs font-semibold text-cyan-300">All Matches ›</Text>
          </Pressable>
        </Link>
      </View>

      {/* Match Cards Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 pb-1"
      >
        {matches.map((match) => {
          const radiantName = match.radiant_team?.name ?? 'Radiant';
          const direName = match.dire_team?.name ?? 'Dire';
          const radiantTag = match.radiant_team?.tag ?? 'RAD';
          const direTag = match.dire_team?.tag ?? 'DIR';

          const hasUserStarters =
            (match.radiant_team_id !== null && userStarterTeamIds.includes(match.radiant_team_id)) ||
            (match.dire_team_id !== null && userStarterTeamIds.includes(match.dire_team_id));

          return (
            <Link key={match.id} href={`/match/${match.id}`} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View live match ${radiantName} vs ${direName}`}
                className="w-64 gap-2.5 rounded-xl border border-red-500/30 bg-slate-950/80 p-3.5"
              >
                {/* Tournament & Bo Format */}
                <View className="flex-row items-center justify-between border-b border-slate-800/80 pb-2">
                  <Text numberOfLines={1} className="flex-1 text-xs font-medium text-slate-300 pr-2">
                    {match.tournament?.name ?? 'Tournament'}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[10px] font-mono text-slate-400">
                      Bo{match.best_of}
                    </Text>
                    <View className="flex-row items-center gap-1 rounded bg-red-950/80 border border-red-800/60 px-1.5 py-0.5">
                      <View className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <Text className="text-[10px] font-bold font-mono text-red-400">
                        LIVE
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Team Matchup */}
                <View className="flex-row items-center justify-between py-1">
                  {/* Radiant */}
                  <View className="flex-1 items-start">
                    <View className="rounded bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 mb-1">
                      <Text className="text-[10px] font-bold text-emerald-400">{radiantTag}</Text>
                    </View>
                    <Text numberOfLines={1} className="text-xs font-bold text-white">
                      {radiantName}
                    </Text>
                    <Text className="text-[9px] text-emerald-400 font-mono">Radiant</Text>
                  </View>

                  {/* VS */}
                  <Text className="text-[11px] font-black text-slate-600 px-2">VS</Text>

                  {/* Dire */}
                  <View className="flex-1 items-end">
                    <View className="rounded bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 mb-1">
                      <Text className="text-[10px] font-bold text-rose-400">{direTag}</Text>
                    </View>
                    <Text numberOfLines={1} className="text-xs font-bold text-white text-right">
                      {direName}
                    </Text>
                    <Text className="text-[9px] text-rose-400 font-mono text-right">Dire</Text>
                  </View>
                </View>

                {/* Footer: Fantasy Status Pill */}
                <View className="flex-row items-center justify-between border-t border-slate-800/80 pt-2">
                  {hasUserStarters ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5">
                      <SymbolView
                        name={{ ios: 'shield.fill', android: 'shield', web: 'shield' }}
                        size={11}
                        tintColor="#34d399"
                      />
                      <Text className="text-[10px] font-semibold text-emerald-300">
                        Starters in Action
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-[10px] text-slate-400">Live Match Centre</Text>
                  )}
                  <Text className="text-[11px] font-semibold text-cyan-400">Details ›</Text>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </View>
  );
}
