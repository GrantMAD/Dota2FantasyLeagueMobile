import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { Achievement } from './achievementsData';

interface ProfileAchievementsProps {
  achievements: Achievement[];
}

const TIER_STYLES = {
  bronze: {
    border: 'border-amber-700/40',
    badge: 'bg-amber-950/70 border-amber-600/40',
    text: 'text-amber-300',
  },
  silver: {
    border: 'border-slate-500/40',
    badge: 'bg-slate-800/80 border-slate-400/40',
    text: 'text-slate-200',
  },
  gold: {
    border: 'border-yellow-500/40',
    badge: 'bg-yellow-950/70 border-yellow-500/50',
    text: 'text-yellow-300',
  },
  platinum: {
    border: 'border-cyan-500/50',
    badge: 'bg-cyan-950/70 border-cyan-500/50',
    text: 'text-cyan-300',
  },
};

export function ProfileAchievements({ achievements }: ProfileAchievementsProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'in-progress'>('all');
  const [expanded, setExpanded] = useState(true);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

  const filtered = achievements.filter((item) => {
    if (filter === 'unlocked') return item.unlocked;
    if (filter === 'in-progress') return !item.unlocked;
    return true;
  });

  return (
    <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <Pressable
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} Achievements & Badges`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="flex-row items-center justify-between border-b border-slate-800 pb-3"
        onPress={() => setExpanded((isExpanded) => !isExpanded)}
      >
        <View className="flex-1 flex-row items-center pr-2">
          <SymbolView
            name={{ ios: 'rosette', android: 'military_tech', web: 'military_tech' }}
            size={18}
            tintColor="#fbbf24"
          />
          <View className="ml-2 flex-1">
            <Text className="text-base font-bold text-white">Achievements & Badges</Text>
            <Text className="text-xs text-slate-400">
              {expanded ? 'Milestones earned across fantasy competition.' : `${unlockedCount} of ${totalCount} unlocked`}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="items-end rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5">
            <Text className="text-[10px] font-semibold text-slate-400">Unlocked</Text>
            <Text className="text-xs font-black text-amber-400">
              {unlockedCount}/{totalCount} ({completionPercentage}%)
            </Text>
          </View>
          <Text className="text-lg text-brand-300">{expanded ? '⌃' : '⌄'}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <>
          {/* Filter tabs */}
          <View className="flex-row gap-2">
            {(['all', 'unlocked', 'in-progress'] as const).map((tab) => {
              const isActive = filter === tab;
              const label = tab === 'all'
                ? `All (${totalCount})`
                : tab === 'unlocked'
                  ? `Unlocked (${unlockedCount})`
                  : `In Progress (${totalCount - unlockedCount})`;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setFilter(tab)}
                  className={`rounded-lg border px-2.5 py-1.5 ${
                    isActive ? 'border-brand-500/50 bg-brand-500/20' : 'border-slate-800 bg-slate-950/40'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${isActive ? 'text-brand-300' : 'text-slate-400'}`}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Badges list */}
          <View className="gap-2.5 pt-1">
            {filtered.map((badge) => {
              const style = TIER_STYLES[badge.tier];

              return (
                <View
                  key={badge.id}
                  className={`rounded-xl border p-3 ${
                    badge.unlocked
                      ? `bg-slate-950/70 ${style.border}`
                      : 'border-slate-800/80 bg-slate-950/30 opacity-70'
                  }`}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 flex-row items-center gap-2.5">
                      <View className="h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
                        <Text className="text-lg">{badge.icon}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-white">{badge.title}</Text>
                        <View className="mt-0.5 flex-row items-center gap-1.5">
                          <View className={`rounded border px-1.5 py-0.5 ${style.badge}`}>
                            <Text className={`text-[9px] font-bold uppercase tracking-wider ${style.text}`}>
                              {badge.tier}
                            </Text>
                          </View>
                          {badge.unlocked && badge.unlockedAtLabel && (
                            <Text className="text-[10px] font-semibold text-emerald-400">
                              • {badge.unlockedAtLabel}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text className={`text-xs font-bold ${badge.unlocked ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {badge.unlocked ? '✓' : '🔒'}
                    </Text>
                  </View>

                  <Text className="mt-2 text-xs leading-4 text-slate-300">
                    {badge.description}
                  </Text>

                  {/* Progress bar */}
                  <View className="mt-3">
                    <View className="mb-1 flex-row justify-between">
                      <Text className="text-[10px] text-slate-400">{badge.progressText}</Text>
                      <Text className="text-[10px] font-semibold text-slate-400">{badge.progressPercent}%</Text>
                    </View>
                    <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <View
                        className={`h-full ${badge.unlocked ? 'bg-emerald-400' : 'bg-brand-500'}`}
                        style={{ width: `${badge.progressPercent}%` }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}
