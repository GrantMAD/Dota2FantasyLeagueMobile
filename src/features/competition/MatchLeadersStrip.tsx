import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export interface LeaderStat {
  playerId: number;
  playerName: string;
  heroName?: string | null;
  role: string;
  value: number;
  formattedValue: string;
}

interface MatchLeadersStripProps {
  fantasyMVP: LeaderStat | null;
  highestDamage: LeaderStat | null;
  highestGPM: LeaderStat | null;
  highestKills: LeaderStat | null;
}

export function MatchLeadersStrip({
  fantasyMVP,
  highestDamage,
  highestGPM,
  highestKills,
}: MatchLeadersStripProps) {
  const router = useRouter();

  if (!fantasyMVP && !highestDamage && !highestGPM && !highestKills) {
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
      data: highestGPM,
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badge: 'GPM',
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
        Match Leaders
      </Text>
      <View className="flex-row flex-wrap gap-2.5">
        {cards.map((c) => {
          if (!c.data) return null;
          return (
            <Pressable
              key={c.title}
              accessibilityRole="button"
              className={`flex-1 min-w-[45%] rounded-2xl border ${c.borderColor} ${c.bgColor} p-3.5 justify-between`}
              onPress={() => router.push(`/player/${c.data!.playerId}`)}
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
                  {c.data.playerName}
                </Text>
                <Text className="text-xs text-slate-400" numberOfLines={1}>
                  {c.data.heroName || c.data.role}
                </Text>
              </View>

              <View className="pt-2 border-t border-slate-800/80 flex-row items-baseline justify-between">
                <Text className="text-[10px] text-slate-500 font-medium">Record</Text>
                <Text className={`font-mono text-sm font-extrabold ${c.textColor}`}>
                  {c.data.formattedValue}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
