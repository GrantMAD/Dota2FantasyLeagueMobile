import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView as HorizontalScrollView, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { getMatchDetails, type MatchPlayerStat } from '@/src/features/competition/api';
import { TeamMatchup } from '@/src/features/competition/TeamMatchup';
import { MatchLeadersStrip } from '@/src/features/competition/MatchLeadersStrip';
import { MatchFantasyImpactBanner } from '@/src/features/competition/MatchFantasyImpactBanner';
import { getDefaultSeriesGame } from '@/src/features/competition/match-series';
import { calculateSeriesLeaders } from '@/src/features/competition/match-series-stats';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time to be confirmed'
    : date.toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
}

function cleanPlayerName(stat: MatchPlayerStat): string {
  const raw = stat.player?.in_game_name || stat.player?.name || '';
  if (!raw || /^Player\s*\(/i.test(raw)) {
    if (stat.hero_name && stat.hero_name.toLowerCase() !== 'unknown' && !/^Hero\s+\d+$/i.test(stat.hero_name)) {
      return stat.hero_name;
    }
    return `Player #${stat.player_id}`;
  }
  return raw;
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const validId = Number.isSafeInteger(matchId) && matchId > 0;
  const [viewMode, setViewMode] = useState<'fantasy' | 'traditional'>('fantasy');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['match-detail', matchId],
    queryFn: () => getMatchDetails(matchId),
    enabled: validId,
    staleTime: 30_000,
  });

  const seriesGames = query.data?.seriesMatches.length
    ? query.data.seriesMatches
    : query.data ? [query.data.match] : [];
  const seriesQueries = useQueries({
    queries: seriesGames.map((game) => ({
      queryKey: ['match-detail', game.id],
      queryFn: () => getMatchDetails(game.id),
      enabled: validId && Boolean(query.data),
      staleTime: 30_000,
      initialData: query.data?.match.id === game.id ? query.data : undefined,
    })),
  });
  const seriesDetails = seriesQueries.flatMap((gameQuery) => gameQuery.data ? [gameQuery.data] : []);
  const defaultGame = getDefaultSeriesGame(seriesGames);
  const activeGameId = seriesGames.some((game) => game.id === selectedGameId)
    ? selectedGameId
    : defaultGame?.id;
  const activeDetails = seriesDetails.find((game) => game.match.id === activeGameId);
  const seriesDetailsReady = seriesGames.length > 0 && seriesDetails.length === seriesGames.length;
  const seriesDetailsError = seriesQueries.find((gameQuery) => gameQuery.isError);
  const seriesLeaders = seriesDetailsReady ? calculateSeriesLeaders(seriesDetails) : null;

  const fantasyPointsByPlayer = new Map<number, number>();
  if (activeDetails?.fantasyBreakdown) {
    for (const item of activeDetails.fantasyBreakdown) {
      fantasyPointsByPlayer.set(item.player_id, Number(item.total_points ?? 0));
    }
  }

  const lineupDetailMap = new Map<number, { slot: string; isCaptain: boolean; isViceCaptain: boolean; isStarter: boolean }>();
  const ownedSet = new Set<number>(activeDetails?.userFantasyImpact?.userOwnedPlayerIds ?? []);
  if (activeDetails?.userFantasyImpact?.lineupDetails) {
    for (const d of activeDetails.userFantasyImpact.lineupDetails) {
      lineupDetailMap.set(d.playerId, d);
    }
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#14b8a6" />
        }
      >
        <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start" onPress={() => router.back()}>
          <Text className="font-semibold text-brand-300">‹ Back to Match Center</Text>
        </Pressable>

        {!validId ? (
          <Text accessibilityRole="alert" className="text-red-300">This match link is invalid.</Text>
        ) : query.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading match details" color="#14b8a6" />
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Match unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load this match.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data && activeDetails ? (
          <>
            {/* Match Header Information */}
            <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {activeDetails.match.status} · {seriesGames.length > 1
                  ? `Game ${activeDetails.match.match_number} of ${seriesGames.length}`
                  : `Match ${activeDetails.match.match_number}`}
              </Text>
              <TeamMatchup
                radiantTeam={activeDetails.match.radiant_team}
                direTeam={activeDetails.match.dire_team}
              />
              {activeDetails.match.winner_team_id != null ? (
                <Text className="text-sm font-semibold text-emerald-300">
                  Winner · {activeDetails.match.winner_team_id === activeDetails.match.radiant_team_id
                    ? activeDetails.match.radiant_team?.name ?? 'Radiant'
                    : activeDetails.match.dire_team?.name ?? 'Dire'}
                </Text>
              ) : null}
              <Text className="text-sm text-slate-300">{formatDate(activeDetails.match.scheduled_at)}</Text>
              <Text className="text-sm text-slate-400">
                Best of {activeDetails.match.best_of}
                {formatDuration(activeDetails.match.duration_seconds)
                  ? ` · ${formatDuration(activeDetails.match.duration_seconds)}`
                  : ''}
                {activeDetails.match.tournament ? ` · ${activeDetails.match.tournament.name}` : ''}
              </Text>
              {activeDetails.match.gameweek_id ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/gameweek/${activeDetails.match.gameweek_id}`)}
                >
                  <Text className="font-semibold text-cyan-300">View gameweek details</Text>
                </Pressable>
              ) : null}
              {activeDetails.match.tournament ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/tournament/${activeDetails.match.tournament?.id}`)}
                >
                  <Text className="font-semibold text-cyan-300">View tournament</Text>
                </Pressable>
              ) : null}
            </View>

            {seriesDetailsReady ? (
              <>
                <MatchFantasyImpactBanner
                  impact={activeDetails.userFantasyImpact}
                  games={seriesDetails}
                />
                <MatchLeadersStrip
                  fantasyMVP={seriesLeaders?.fantasyMVP ?? null}
                  highestDamage={seriesLeaders?.highestDamage ?? null}
                  highestEconomy={seriesLeaders?.highestEconomy ?? null}
                  highestKills={seriesLeaders?.highestKills ?? null}
                />
              </>
            ) : seriesDetailsError ? (
              <View accessibilityRole="alert" className="flex-row items-center justify-between gap-3 rounded-xl border border-red-900 bg-red-950 p-4">
                <Text className="flex-1 text-sm text-red-100">Series totals are unavailable because a game could not be loaded.</Text>
                <Pressable accessibilityRole="button" onPress={() => void seriesDetailsError.refetch()}>
                  <Text className="font-semibold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator accessibilityLabel="Loading series statistics" color="#14b8a6" />
                <Text className="text-xs text-slate-400">Loading series statistics</Text>
              </View>
            )}

            {seriesGames.length > 1 ? (
              <View className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">Series games</Text>
                <HorizontalScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {seriesGames.map((game, index) => {
                      const isSelected = game.id === activeDetails.match.id;
                      const gameNumber = game.match_number || index + 1;
                      const gameTime = new Date(game.scheduled_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      });
                      return (
                        <Pressable
                          key={game.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          className={`min-h-11 rounded-xl border px-3 py-2 ${
                            isSelected ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
                          }`}
                          onPress={() => setSelectedGameId(game.id)}
                        >
                          <Text className={`text-xs font-bold ${isSelected ? 'text-brand-300' : 'text-slate-300'}`}>
                            Game {gameNumber}
                          </Text>
                          <Text className="text-[10px] text-slate-500">{gameTime}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </HorizontalScrollView>
              </View>
            ) : null}

            {/* Player Performance Header & View Mode Switcher */}
            <View className="gap-3 mt-1">
              <View className="flex-row items-center justify-between flex-wrap gap-2">
                <View>
                  <Text className="text-xl font-bold text-white">Player Performance</Text>
                  <Text className="text-xs text-slate-400">Detailed scoring and esports statistics</Text>
                </View>

                {/* View Mode Switcher Pills */}
                <View className="flex-row bg-slate-900 border border-slate-800 rounded-xl p-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: viewMode === 'fantasy' }}
                    className={`px-3 py-1.5 rounded-lg ${viewMode === 'fantasy' ? 'bg-amber-500' : 'bg-transparent'}`}
                    onPress={() => setViewMode('fantasy')}
                  >
                    <Text className={`text-xs font-bold ${viewMode === 'fantasy' ? 'text-slate-950' : 'text-slate-400'}`}>
                      Fantasy
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: viewMode === 'traditional' }}
                    className={`px-3 py-1.5 rounded-lg ${viewMode === 'traditional' ? 'bg-amber-500' : 'bg-transparent'}`}
                    onPress={() => setViewMode('traditional')}
                  >
                    <Text className={`text-xs font-bold ${viewMode === 'traditional' ? 'text-slate-950' : 'text-slate-400'}`}>
                      Traditional
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Player Listing Cards */}
              {activeDetails.playerStats.length ? (
                activeDetails.playerStats.map((player) => {
                  const pName = cleanPlayerName(player);
                  const lineup = lineupDetailMap.get(player.player_id);
                  const isOwned = ownedSet.has(player.player_id);
                  const fBreakdown = activeDetails.fantasyBreakdown.find((b) => b.player_id === player.player_id);
                  const totalPts = fBreakdown?.total_points ?? fantasyPointsByPlayer.get(player.player_id);

                  return (
                    <Pressable
                      key={player.id}
                      accessibilityRole="button"
                      className={`gap-2.5 rounded-xl border p-4 ${
                        isOwned
                          ? 'border-emerald-500/60 bg-emerald-950/30'
                          : 'border-slate-800 bg-slate-900'
                      }`}
                      onPress={() => router.push(`/player/${player.player_id}`)}
                    >
                      {/* Name, Hero, Team, Badges */}
                      <View className="flex-row items-center justify-between gap-2 flex-wrap">
                        <View className="flex-row items-center gap-1.5 flex-wrap flex-1">
                          <Text className="font-semibold text-white text-base">{pName}</Text>
                          {player.hero_name && (
                            <View className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                              <Text className="text-[10px] text-slate-300">{player.hero_name}</Text>
                            </View>
                          )}
                          {lineup?.isCaptain && (
                            <View className="bg-amber-500 px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] font-black text-slate-950">CAPTAIN</Text>
                            </View>
                          )}
                          {lineup?.isViceCaptain && (
                            <View className="bg-purple-900 border border-purple-500 px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] font-bold text-purple-200">VC</Text>
                            </View>
                          )}
                          {isOwned && (
                            <View className="bg-emerald-950 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] font-semibold text-emerald-300">IN SQUAD</Text>
                            </View>
                          )}
                        </View>

                        <Text className="font-mono text-sm font-bold text-emerald-400">
                          {totalPts !== undefined && totalPts !== null ? `${totalPts.toFixed(1)} pts` : '—'}
                        </Text>
                      </View>

                      {/* Dynamic Content Based on View Mode */}
                      {viewMode === 'fantasy' ? (
                        <View className="pt-2 border-t border-slate-800/80 flex-row flex-wrap items-center justify-between gap-2">
                          <View className="flex-row items-center gap-3 flex-wrap">
                            <Text className="text-xs text-slate-400">
                              Combat: <Text className="font-mono text-slate-200 font-medium">{fBreakdown?.combat_points !== undefined && fBreakdown?.combat_points !== null ? fBreakdown.combat_points.toFixed(1) : '—'}</Text>
                            </Text>
                            <Text className="text-xs text-slate-400">
                              Econ: <Text className="font-mono text-slate-200 font-medium">{fBreakdown?.economy_points !== undefined && fBreakdown?.economy_points !== null ? fBreakdown.economy_points.toFixed(1) : '—'}</Text>
                            </Text>
                            <Text className="text-xs text-slate-400">
                              Obj: <Text className="font-mono text-slate-200 font-medium">{fBreakdown?.objective_points !== undefined && fBreakdown?.objective_points !== null ? fBreakdown.objective_points.toFixed(1) : '—'}</Text>
                            </Text>
                            <Text className="text-xs text-slate-400">
                              TF: <Text className="font-mono text-slate-200 font-medium">{fBreakdown?.teamfight_points !== undefined && fBreakdown?.teamfight_points !== null ? fBreakdown.teamfight_points.toFixed(1) : '—'}</Text>
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View className="pt-2 border-t border-slate-800/80 flex-row flex-wrap items-center justify-between gap-3">
                          <Text className="text-xs text-slate-300">
                            K / D / A · <Text className="font-mono font-medium">{player.kills} / {player.deaths} / {player.assists}</Text>
                          </Text>
                          <Text className="text-xs text-slate-400">
                            {player.gold_per_minute !== null ? `${player.gold_per_minute} GPM` : ''}
                            {player.hero_damage !== null ? ` · ${Number(player.hero_damage).toLocaleString()} Dmg` : ''}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })
              ) : (
                <View className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <Text className="text-sm text-slate-400">Player statistics have not been published for this game.</Text>
                </View>
              )}
            </View>
          </>
        ) : query.data && seriesDetailsError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Series game unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {seriesDetailsError.error instanceof Error
                ? seriesDetailsError.error.message
                : 'Unable to load the default series game.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void seriesDetailsError.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data ? (
          <ActivityIndicator accessibilityLabel="Loading selected series game" color="#14b8a6" />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
