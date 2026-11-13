import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { MatchDetails, UserFantasyImpact } from './api';
import { calculateSeriesFantasyImpact } from './match-series-stats';

interface MatchFantasyImpactBannerProps {
  impact: UserFantasyImpact | null | undefined;
  games: MatchDetails[];
}

export function MatchFantasyImpactBanner({ impact, games }: MatchFantasyImpactBannerProps) {
  const router = useRouter();
  if (!impact) return null;

  const { players, totalEffectivePoints } = calculateSeriesFantasyImpact(games, impact);
  if (players.length === 0) {
    return (
      <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fantasy Squad Status
          </Text>
          <Text className="mt-0.5 text-xs text-slate-400">
            None of your fantasy squad players featured in this series.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5"
          onPress={() => router.push('/team')}
        >
          <Text className="text-xs font-semibold text-cyan-300">View Lineup</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-3.5 overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 p-4">
      <View className="flex-row items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-white">Your Fantasy Impact</Text>
            <View className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-amber-300">
                {players.length} {players.length === 1 ? 'PLAYER' : 'PLAYERS'}
              </Text>
            </View>
          </View>
          <Text className="mt-0.5 text-xs text-slate-400">
            Points contributed across this series
          </Text>
        </View>

        <View className="items-end rounded-xl border border-amber-500/30 bg-slate-950/80 px-3 py-1.5">
          <Text className="text-[10px] font-semibold uppercase text-slate-400">Series total</Text>
          <Text className="font-mono text-lg font-black text-amber-400">
            {totalEffectivePoints > 0 ? '+' : ''}{totalEffectivePoints.toFixed(1)}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        {players.map((player) => (
          <View key={player.playerId} className="gap-2">
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5"
              onPress={() => router.push(`/player/${player.playerId}`)}
            >
              <View className="mr-2 flex-1">
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <Text className="text-xs font-bold text-white">{player.playerName}</Text>
                  {player.isCaptain ? (
                    <View className="rounded bg-amber-500 px-1 py-0.5">
                      <Text className="text-[9px] font-black text-slate-950">CAPTAIN {player.multiplier}x</Text>
                    </View>
                  ) : null}
                  {player.isViceCaptain ? (
                    <View className="rounded border border-purple-500/40 bg-purple-900/80 px-1 py-0.5">
                      <Text className="text-[9px] font-bold text-purple-300">VC</Text>
                    </View>
                  ) : null}
                  {!player.isStarter ? (
                    <View className="rounded border border-emerald-500/40 bg-emerald-950 px-1 py-0.5">
                      <Text className="text-[9px] font-semibold text-emerald-300">BENCH</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-[11px] text-slate-400">
                  {player.slot}{player.heroName ? ` · ${player.heroName}` : ''} · {player.gamesPlayed} {player.gamesPlayed === 1 ? 'game' : 'games'}
                </Text>
              </View>

              <View className="items-end">
                <Text className="font-mono text-xs font-bold text-emerald-300">
                  {player.effectivePoints > 0 ? '+' : ''}{player.effectivePoints.toFixed(1)} pts
                </Text>
                {player.multiplier !== 1 ? (
                  <Text className="text-[10px] text-slate-500">
                    Series base: {player.fantasyPoints.toFixed(1)} pts
                  </Text>
                ) : null}
              </View>
            </Pressable>

            <View className="ml-2 gap-1 border-l border-amber-500/20 pl-3">
              {player.gameValues.map((game) => (
                <View key={game.matchId} className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-[10px] text-slate-500" numberOfLines={1}>
                    Game {game.matchNumber} · {new Date(game.scheduledAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text className="text-[10px] font-mono font-semibold text-slate-300">
                    {game.fantasyPoints.toFixed(1)} × {player.multiplier} = {game.effectivePoints > 0 ? '+' : ''}{game.effectivePoints.toFixed(1)} pts
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
