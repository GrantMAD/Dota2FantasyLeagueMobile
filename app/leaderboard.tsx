import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { getGameweeks } from '@/src/features/gameweeks/api';
import { getLeaderboard } from '@/src/features/leaderboard/api';
import { useAuth } from '@/src/lib/auth';

const PAGE_SIZE = 50;

function formatUpdatedAt(value: string | null): string {
  if (!value) return 'Update time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Update time unavailable' : `Updated ${date.toLocaleString()}`;
}

export default function LeaderboardScreen() {
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const [gameweekId, setGameweekId] = useState<number | null>(null);
  const gameweeks = useQuery({
    queryKey: ['gameweeks'],
    queryFn: getGameweeks,
    staleTime: 60_000,
  });
  const leaderboard = useQuery({
    queryKey: ['leaderboard', gameweekId, page],
    queryFn: () => getLeaderboard({ gameweekId, page }),
    staleTime: 60_000,
  });
  const totalPages = leaderboard.data ? Math.max(1, Math.ceil(leaderboard.data.total / PAGE_SIZE)) : 1;

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={leaderboard.isRefetching || gameweeks.isRefetching}
            onRefresh={() => {
              void leaderboard.refetch();
              void gameweeks.refetch();
            }}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Global rankings</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Leaderboard</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Compare season totals or select a gameweek to view its standings.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: gameweekId === null }}
            className={`min-h-10 justify-center rounded-full border px-4 ${
              gameweekId === null ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
            }`}
            onPress={() => {
              setGameweekId(null);
              setPage(1);
            }}
          >
            <Text className={`text-sm font-semibold ${gameweekId === null ? 'text-brand-300' : 'text-slate-300'}`}>
              Overall
            </Text>
          </Pressable>
          {(gameweeks.data ?? []).map((gameweek) => {
            const isUpcoming = gameweek.status === 'upcoming';
            const isSelected = gameweekId === gameweek.id;
            return (
              <Pressable
                key={gameweek.id}
                accessibilityRole="button"
                accessibilityState={{ disabled: isUpcoming, selected: isSelected }}
                accessibilityHint={isUpcoming ? 'Available when this gameweek begins.' : undefined}
                className={`min-h-10 justify-center rounded-full border px-4 ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/15'
                    : isUpcoming
                      ? 'border-slate-800 bg-slate-950 opacity-40'
                      : 'border-slate-700 bg-slate-900'
                }`}
                disabled={isUpcoming}
                onPress={() => {
                  setGameweekId(gameweek.id);
                  setPage(1);
                }}
              >
                <Text className={`text-sm font-semibold ${
                  isSelected ? 'text-brand-300' : isUpcoming ? 'text-slate-500' : 'text-slate-300'
                }`}>
                  GW {gameweek.gameweek_number}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {gameweeks.isError ? (
          <Text accessibilityRole="alert" className="text-sm text-amber-300">
            Gameweek filters could not be loaded. The overall leaderboard is still available.
          </Text>
        ) : null}

        {leaderboard.isPending ? (
          <View accessibilityLabel="Loading leaderboard" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : leaderboard.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Leaderboard unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {leaderboard.error instanceof Error ? leaderboard.error.message : 'Unable to load rankings.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void leaderboard.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="gap-1">
              <Text className="text-sm text-slate-300">{leaderboard.data.total} managers</Text>
              <Text className="text-xs text-slate-500">{formatUpdatedAt(leaderboard.data.lastRecalculatedAt)}</Text>
            </View>
            {leaderboard.data.entries.length ? (
              <View className="gap-2">
                {leaderboard.data.entries.map((entry) => {
                  const isCurrentUser = entry.fantasyTeam.userId === session?.user.id;
                  return (
                    <View
                      key={`${entry.id}-${entry.rank}`}
                      className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                        isCurrentUser ? 'border-brand-500/60 bg-brand-500/10' : 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      <Text className="w-9 text-center text-base font-bold text-amber-300">#{entry.rank}</Text>
                      <View className="flex-1">
                        <Text className={`font-semibold ${isCurrentUser ? 'text-brand-200' : 'text-white'}`}>
                          {entry.fantasyTeam.name}{isCurrentUser ? ' · You' : ''}
                        </Text>
                        {entry.fantasyTeam.username ? (
                          <Text className="mt-1 text-xs text-slate-500">@{entry.fantasyTeam.username}</Text>
                        ) : null}
                      </View>
                      <View className="items-end">
                        <Text className="font-bold text-white">{entry.totalPoints}</Text>
                        <Text className="text-xs text-slate-500">{entry.gameweekPoints} GW</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
                <Text className="text-center text-sm text-slate-300">No rankings are available for this selection yet.</Text>
              </View>
            )}

            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: page <= 1 }}
                className={`min-h-11 justify-center rounded-xl border border-slate-700 px-4 ${page <= 1 ? 'opacity-40' : 'bg-slate-900'}`}
                disabled={page <= 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
              >
                <Text className="font-semibold text-white">Previous</Text>
              </Pressable>
              <Text className="text-sm text-slate-400">Page {page} of {totalPages}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: page >= totalPages }}
                className={`min-h-11 justify-center rounded-xl border border-slate-700 px-4 ${page >= totalPages ? 'opacity-40' : 'bg-slate-900'}`}
                disabled={page >= totalPages}
                onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                <Text className="font-semibold text-white">Next</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
