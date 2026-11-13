import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { SeriesLeader } from './match-series-stats';

export type LeaderStat = SeriesLeader;

interface MatchLeadersStripProps {
  fantasyMVP: LeaderStat | null;
  highestDamage: LeaderStat | null;
  highestEconomy: LeaderStat | null;
  highestKills: LeaderStat | null;
}

export function MatchLeadersStrip({
  fantasyMVP,
  highestDamage,
  highestEconomy,
  highestKills,
}: MatchLeadersStripProps) {
  const router = useRouter();

  if (!fantasyMVP && !highestDamage && !highestEconomy && !highestKills) {
    return null;
  }

  const cards = [
    {
      title: 'Fantasy MVP',
      emoji: '🏆',
      data: fantasyMVP,
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      badge: 'TOP FANTASY',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
    },
    {
      title: 'Top Damage',
      emoji: '🔥',
      data: highestDamage,
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      badge: 'HERO DAMAGE',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-300',
    },
    {
      title: 'Top Economy',
      emoji: '🪙',
      data: highestEconomy,
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badge: 'EST. GOLD',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
    },
    {
      title: 'Kill Leader',
      emoji: '🎯',
      data: highestKills,
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      badge: 'KILLS',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300',
    },
  ];

  return (
    <View className="gap-3">
      <Text className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Series Leaders
      </Text>
      <View className="flex-row flex-wrap gap-2.5">
        {cards.map((c) => {
          const data = c.data;
          if (!data) return null;
          return (
            <Pressable
              key={c.title}
              accessibilityRole="button"
              className={`flex-1 min-w-[45%] rounded-2xl border ${c.borderColor} ${c.bgColor} p-3.5 justify-between`}
              onPress={() => router.push(`/player/${data.playerId}`)}
            >
              <View className="flex-row items-center justify-between gap-1 mb-2">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex-row items-center">
                  {c.emoji} {c.title}
                </Text>
                <View className={`rounded px-1.5 py-0.5 ${c.badgeBg}`}>
                  <Text className={`text-[9px] font-black uppercase ${c.badgeText}`}>
                    {c.badge}
                  </Text>
                </View>
              </View>

              <View className="mb-2">
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  {data.playerName}
                </Text>
                <Text className="text-xs text-slate-400" numberOfLines={1}>
                  {data.heroName || data.role}
                </Text>
              </View>

              <View className="pt-2 border-t border-slate-800/80 flex-row items-baseline justify-between">
                <Text className="text-[10px] text-slate-500 font-medium">Series total</Text>
                <Text className={`font-mono text-sm font-extrabold ${c.textColor}`}>
                  {data.formattedValue}
                </Text>
              </View>
              <View className="mt-2 gap-1 border-t border-slate-800/80 pt-2">
                {data.gameValues.map((game) => (
                  <View key={game.matchId} className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 text-[10px] text-slate-500" numberOfLines={1}>
                      Game {game.matchNumber} · {new Date(game.scheduledAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text className={`font-mono text-[10px] font-semibold ${c.textColor}`}>
                      {game.formattedValue}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
