import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { GameweekHistory, GameweekHistoryPlayer } from './api';

interface GameweekSquadLineupProps {
  gameweekId: number;
  gameweekNumber: number;
  gameweekStatus: string;
  deadline: string | null;
  history: GameweekHistory | null;
  isLoading: boolean;
}

const ROLE_BADGE_STYLES: Record<string, { label: string; textClass: string; bgClass: string; borderClass: string }> = {
  Carry: { label: 'Pos 1 · Carry', textClass: 'text-cyan-300', bgClass: 'bg-cyan-500/15', borderClass: 'border-cyan-500/30' },
  Mid: { label: 'Pos 2 · Mid', textClass: 'text-purple-300', bgClass: 'bg-purple-500/15', borderClass: 'border-purple-500/30' },
  Offlane: { label: 'Pos 3 · Offlane', textClass: 'text-amber-300', bgClass: 'bg-amber-500/15', borderClass: 'border-amber-500/30' },
  Support: { label: 'Pos 4 · Support', textClass: 'text-emerald-300', bgClass: 'bg-emerald-500/15', borderClass: 'border-emerald-500/30' },
  'Hard Support': { label: 'Pos 5 · Hard Support', textClass: 'text-rose-300', bgClass: 'bg-rose-500/15', borderClass: 'border-rose-500/30' },
};

function formatDeadline(value: string | null): string {
  if (!value) return 'Not announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not announced'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

function PlayerAvatar({ player }: { player: GameweekHistoryPlayer }) {
  if (player.profileImageUrl) {
    return (
      <Image
        source={{ uri: player.profileImageUrl }}
        className="h-10 w-10 rounded-full"
        accessibilityLabel={`${player.name} avatar`}
      />
    );
  }
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
      <Text className="font-bold text-slate-300">{player.name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function GameweekSquadLineup({
  gameweekNumber,
  gameweekStatus,
  deadline,
  history,
  isLoading,
}: GameweekSquadLineupProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <View className="h-5 w-40 rounded bg-slate-800" />
        <View className="h-24 rounded-xl bg-slate-800/60" />
      </View>
    );
  }

  if (!history) {
    return null;
  }

  const { managerScore, globalAverage, starters = [], bench = [], activeChip } = history;
  const isUpcoming = gameweekStatus === 'upcoming';
  const isActive = gameweekStatus === 'active';
  const isFinal = gameweekStatus === 'closed' || gameweekStatus === 'locked';

  const scoreDelta =
    managerScore !== null && globalAverage !== null
      ? Math.round((managerScore - globalAverage) * 10) / 10
      : null;

  const benchTotal = bench.reduce((sum, p) => sum + (p.points || 0), 0);

  return (
    <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      {/* Header with Title & Chip Badge */}
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          <View className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Your Lineup</Text>
          </View>

          {isActive && (
            <View className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5">
              <Text className="text-[10px] font-semibold text-emerald-300">● Live Scoring</Text>
            </View>
          )}

          {isFinal && (
            <View className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5">
              <Text className="text-[10px] font-semibold text-slate-300">Final Squad</Text>
            </View>
          )}

          {isUpcoming && (
            <View className="rounded-full border border-sky-500/40 bg-sky-500/15 px-2.5 py-0.5">
              <Text className="text-[10px] font-semibold text-sky-300">Projected Lineup</Text>
            </View>
          )}

          {activeChip === 'triple_captain' && (
            <View className="rounded-full border border-amber-500/50 bg-amber-500/20 px-2.5 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-amber-300">⚡ Triple Captain (3×)</Text>
            </View>
          )}

          {activeChip === 'bench_boost' && (
            <View className="rounded-full border border-cyan-500/50 bg-cyan-500/20 px-2.5 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-cyan-300">🚀 Bench Boost</Text>
            </View>
          )}

          {activeChip === 'wildcard' && (
            <View className="rounded-full border border-purple-500/50 bg-purple-500/20 px-2.5 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-purple-300">🃏 Wildcard</Text>
            </View>
          )}
        </View>

        <Text className="text-xl font-bold text-white">Gameweek {gameweekNumber} Squad</Text>
        <Text className="text-xs text-slate-400">
          {isUpcoming
            ? `Locks at deadline · ${formatDeadline(deadline)}`
            : 'Points earned by your starting 5 and bench contributors'}
        </Text>
      </View>

      {/* Stat Tiles: Manager Score & League Average */}
      <View className="flex-row items-center gap-3">
        <View className="flex-1 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            {isUpcoming ? 'Status' : 'Your Score'}
          </Text>
          <Text className="text-2xl font-black text-white">
            {isUpcoming ? 'Ready' : managerScore !== null ? managerScore.toFixed(1) : '0.0'}
          </Text>
          <Text className="text-[10px] text-emerald-300/80">{isUpcoming ? 'Saved' : 'fantasy pts'}</Text>
        </View>

        {!isUpcoming && globalAverage !== null && (
          <View className="flex-1 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">League Avg</Text>
            <Text className="text-xl font-bold text-slate-200">{globalAverage.toFixed(1)}</Text>
            {scoreDelta !== null && (
              <Text
                className={`text-[10px] font-semibold ${
                  scoreDelta > 0 ? 'text-emerald-400' : scoreDelta < 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} vs avg
              </Text>
            )}
          </View>
        )}

        {isUpcoming && (
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-xl bg-cyan-500 p-3.5"
            onPress={() => router.push('/(tabs)/team?tab=lineup')}
          >
            <Text className="font-bold text-slate-950">Edit Lineup ›</Text>
          </Pressable>
        )}
      </View>

      {/* Empty State if no starters */}
      {starters.length === 0 ? (
        <View className="items-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-5">
          <Text className="text-center text-sm text-slate-300">
            {isUpcoming
              ? `You have not set your starting 5 for Gameweek ${gameweekNumber} yet.`
              : `No active fantasy squad was recorded for Gameweek ${gameweekNumber}.`}
          </Text>
          {isUpcoming && (
            <Pressable
              accessibilityRole="button"
              className="mt-3 rounded-lg bg-cyan-500 px-4 py-2"
              onPress={() => router.push('/(tabs)/team?tab=lineup')}
            >
              <Text className="text-xs font-bold text-slate-950">Set Starting 5</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          {/* Starters Section */}
          <View className="gap-2.5">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">Starting Five</Text>
            {starters.map((player) => {
              const roleConfig = ROLE_BADGE_STYLES[player.role] || {
                label: player.role,
                textClass: 'text-slate-300',
                bgClass: 'bg-slate-800',
                borderClass: 'border-slate-700',
              };

              return (
                <Pressable
                  key={`${player.role}-${player.id}`}
                  accessibilityRole="button"
                  className={`flex-row items-center justify-between rounded-xl border bg-slate-950/70 p-3 ${
                    player.isCaptain ? 'border-amber-500/40 bg-amber-950/15' : 'border-slate-800'
                  }`}
                  onPress={() => router.push(`/player/${player.id}`)}
                >
                  <View className="flex-row items-center gap-3 flex-1 min-w-0 pr-2">
                    <PlayerAvatar player={player} />
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="font-bold text-white truncate" numberOfLines={1}>
                          {player.name}
                        </Text>
                        {player.isCaptain && (
                          <View className="rounded bg-amber-500/20 border border-amber-500/50 px-1.5 py-0.5">
                            <Text className="text-[10px] font-black uppercase text-amber-300">
                              C {player.multiplier && player.multiplier > 1 ? `(${player.multiplier}×)` : ''}
                            </Text>
                          </View>
                        )}
                        {player.isViceCaptain && (
                          <View className="rounded bg-sky-500/20 border border-sky-500/40 px-1.5 py-0.5">
                            <Text className="text-[10px] font-bold uppercase text-sky-300">VC</Text>
                          </View>
                        )}
                      </View>
                      <View className="mt-1 flex-row items-center gap-2">
                        <View className={`rounded border px-1.5 py-0.5 ${roleConfig.bgClass} ${roleConfig.borderClass}`}>
                          <Text className={`text-[10px] font-bold uppercase ${roleConfig.textClass}`}>
                            {roleConfig.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="items-end shrink-0">
                    <Text className="text-base font-black text-emerald-400">
                      {isUpcoming ? '—' : `${player.points.toFixed(1)} pts`}
                    </Text>
                    {player.isCaptain && player.rawPoints !== undefined && player.multiplier && player.multiplier > 1 && !isUpcoming && (
                      <Text className="text-[10px] text-amber-300/80">
                        ({player.rawPoints.toFixed(1)} × {player.multiplier})
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Bench Section */}
          {bench.length > 0 && (
            <View className="gap-2 pt-2 border-t border-slate-800">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">Bench Substitutes</Text>
                  {activeChip === 'bench_boost' && (
                    <View className="rounded-full border border-cyan-500/40 bg-cyan-500/20 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-cyan-300">Scored (Bench Boost)</Text>
                    </View>
                  )}
                </View>
                {!isUpcoming && (
                  <Text className="text-[11px] text-slate-400">
                    Bench: <Text className="font-semibold text-slate-200">{benchTotal.toFixed(1)} pts</Text>
                  </Text>
                )}
              </View>

              {bench.map((player, idx) => (
                <Pressable
                  key={`${player.role}-${player.id}-${idx}`}
                  accessibilityRole="button"
                  className="flex-row items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5"
                  onPress={() => router.push(`/player/${player.id}`)}
                >
                  <View className="flex-row items-center gap-2.5 flex-1 min-w-0 pr-2">
                    <View className="rounded bg-slate-800 px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-slate-400">B{idx + 1}</Text>
                    </View>
                    <PlayerAvatar player={player} />
                    <View className="flex-1 min-w-0">
                      <Text className="text-xs font-semibold text-white truncate" numberOfLines={1}>
                        {player.name}
                      </Text>
                      <Text className="text-[10px] text-slate-400">{player.role}</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-slate-300">
                    {isUpcoming ? '—' : `${player.points.toFixed(1)} pts`}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

