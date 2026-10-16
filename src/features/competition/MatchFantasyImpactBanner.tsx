import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { UserFantasyImpact, MatchPlayerStat } from './api';

interface MatchFantasyImpactBannerProps {
  impact: UserFantasyImpact | null | undefined;
  playerStats: MatchPlayerStat[];
  fantasyPointsByPlayer: Map<number, number>;
  gameweekId?: number | null;
}

interface PlayerImpactSummary {
  playerId: number;
  playerName: string;
  heroName?: string | null;
  role: string;
  fantasyPoints: number;
  effectivePoints: number;
  multiplier: number;
  slot: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarter: boolean;
  isOwned: boolean;
}

export function MatchFantasyImpactBanner({
  impact,
  playerStats,
  fantasyPointsByPlayer,
  gameweekId,
}: MatchFantasyImpactBannerProps) {
  const router = useRouter();

  if (!impact) return null;

  const lineupMap = new Map(impact.lineupDetails.map((detail) => [detail.playerId, detail]));
  const ownedSet = new Set(impact.userOwnedPlayerIds);

  const matchedPlayers: PlayerImpactSummary[] = [];

  for (const stat of playerStats) {
    const isOwned = ownedSet.has(stat.player_id);
    const lineup = lineupMap.get(stat.player_id);

    if (isOwned || lineup) {
      const basePoints = fantasyPointsByPlayer.get(stat.player_id) ?? 0;
      let multiplier = 1;
      if (lineup?.isCaptain) {
        multiplier = 2;
      } else if (!lineup?.isStarter) {
        multiplier = 0; // Bench players don't count towards starting score
      }

      const effectivePoints = basePoints * multiplier;
      const playerName =
        stat.player?.in_game_name || stat.player?.name || `Player #${stat.player_id}`;

      matchedPlayers.push({
        playerId: stat.player_id,
        playerName,
        heroName: stat.hero_name,
        role: 'Player',
        fantasyPoints: basePoints,
        effectivePoints,
        multiplier,
        slot: lineup?.slot || 'Squad Bench',
        isCaptain: Boolean(lineup?.isCaptain),
        isViceCaptain: Boolean(lineup?.isViceCaptain),
        isStarter: Boolean(lineup?.isStarter),
        isOwned,
      });
    }
  }

  if (matchedPlayers.length === 0) {
    return (
      <View className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fantasy Squad Status
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            None of your fantasy squad players featured in this match.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          className="rounded-lg bg-slate-800 px-3 py-1.5 border border-slate-700"
          onPress={() => router.push('/team')}
        >
          <Text className="text-xs font-semibold text-cyan-300">View Lineup</Text>
        </Pressable>
      </View>
    );
  }

  const totalEffectivePoints = matchedPlayers.reduce((acc, p) => acc + p.effectivePoints, 0);

  return (
    <View className="overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 p-4 gap-3.5">
      <View className="flex-row items-center justify-between border-b border-amber-500/20 pb-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-white">Your Fantasy Impact</Text>
            <View className="rounded-full bg-amber-500/20 px-2 py-0.5 border border-amber-500/30">
              <Text className="text-[10px] font-bold text-amber-300">
                {matchedPlayers.length} {matchedPlayers.length === 1 ? 'PLAYER' : 'PLAYERS'}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-slate-400 mt-0.5">
            Points contributed to your gameweek total
          </Text>
        </View>

        <View className="items-end bg-slate-950/80 border border-amber-500/30 rounded-xl px-3 py-1.5">
          <Text className="text-[10px] font-semibold uppercase text-slate-400">Score</Text>
          <Text className="font-mono text-lg font-black text-amber-400">
            +{totalEffectivePoints.toFixed(1)}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        {matchedPlayers.map((player) => (
          <Pressable
            key={player.playerId}
            accessibilityRole="button"
            className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-2.5"
            onPress={() => router.push(`/player/${player.playerId}`)}
          >
            <View className="flex-1 mr-2">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text className="font-bold text-white text-xs">{player.playerName}</Text>
                {player.isCaptain && (
                  <View className="bg-amber-500 rounded px-1 py-0.2">
                    <Text className="text-[9px] font-black text-slate-950">CAPTAIN 2x</Text>
                  </View>
                )}
                {player.isViceCaptain && (
                  <View className="bg-purple-900/80 border border-purple-500/40 rounded px-1 py-0.2">
                    <Text className="text-[9px] font-bold text-purple-300">VC</Text>
                  </View>
                )}
                {player.isOwned && !player.isStarter && (
                  <View className="bg-emerald-950 border border-emerald-500/40 rounded px-1 py-0.2">
                    <Text className="text-[9px] font-semibold text-emerald-300">BENCH</Text>
                  </View>
                )}
              </View>
              <Text className="text-[11px] text-slate-400">
                {player.slot} {player.heroName ? `· ${player.heroName}` : ''}
              </Text>
            </View>

            <View className="items-end">
              <Text className="font-mono text-xs font-bold text-emerald-300">
                {player.multiplier > 1
                  ? `${player.effectivePoints.toFixed(1)} pts (${player.multiplier}x)`
                  : `${player.effectivePoints.toFixed(1)} pts`}
              </Text>
              {player.multiplier === 0 && (
                <Text className="text-[10px] text-slate-500">Bench (0x)</Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
