import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Screen } from '@/src/components/Screen';
import { getMatchDetails, type MatchPlayerStat } from '@/src/features/competition/api';
import { TeamMatchup } from '@/src/features/competition/TeamMatchup';
import { MatchLeadersStrip, type LeaderStat } from '@/src/features/competition/MatchLeadersStrip';
import { MatchFantasyImpactBanner } from '@/src/features/competition/MatchFantasyImpactBanner';

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

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const validId = Number.isSafeInteger(matchId) && matchId > 0;
  const [viewMode, setViewMode] = useState<'fantasy' | 'traditional'>('fantasy');

  const query = useQuery({
    queryKey: ['match-detail', matchId],
    queryFn: () => getMatchDetails(matchId),
    enabled: validId,
    staleTime: 30_000,
  });

  const fantasyPointsByPlayer = new Map<number, number>();
  if (query.data?.fantasyBreakdown) {
    for (const item of query.data.fantasyBreakdown) {
      fantasyPointsByPlayer.set(item.player_id, Number(item.total_points ?? 0));
    }
  }

  const lineupDetailMap = new Map<number, { slot: string; isCaptain: boolean; isViceCaptain: boolean; isStarter: boolean }>();
  const ownedSet = new Set<number>(query.data?.userFantasyImpact?.userOwnedPlayerIds ?? []);
  if (query.data?.userFantasyImpact?.lineupDetails) {
    for (const d of query.data.userFantasyImpact.lineupDetails) {
      lineupDetailMap.set(d.playerId, d);
    }
  }

  // Calculate Match Leaders
  let fantasyMVP: LeaderStat | null = null;
  let highestDamage: LeaderStat | null = null;
  let highestGPM: LeaderStat | null = null;
  let highestKills: LeaderStat | null = null;

  if (query.data?.playerStats) {
    for (const s of query.data.playerStats) {
      const pName = cleanPlayerName(s);
      const role = 'Core';
      const pts = fantasyPointsByPlayer.get(s.player_id) ?? 0;
      const dmg = Number(s.hero_damage || 0);
      const gpm = Number(s.gold_per_minute || 0);
      const kills = Number(s.kills || 0);

      if (!fantasyMVP || pts > fantasyMVP.value) {
        fantasyMVP = { playerId: s.player_id, playerName: pName, heroName: s.hero_name, role, value: pts, formattedValue: `${pts.toFixed(1)} pts` };
      }
      if (!highestDamage || dmg > highestDamage.value) {
        highestDamage = { playerId: s.player_id, playerName: pName, heroName: s.hero_name, role, value: dmg, formattedValue: dmg.toLocaleString() };
      }
      if (!highestGPM || gpm > highestGPM.value) {
        highestGPM = { playerId: s.player_id, playerName: pName, heroName: s.hero_name, role, value: gpm, formattedValue: `${gpm} GPM` };
      }
      if (!highestKills || kills > highestKills.value) {
        highestKills = { playerId: s.player_id, playerName: pName, heroName: s.hero_name, role, value: kills, formattedValue: `${kills} kills` };
      }
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
        ) : query.data ? (
          <>
            {/* Match Header Information */}
            <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {query.data.match.status} · Match {query.data.match.match_number}
              </Text>
              <TeamMatchup
                radiantTeam={query.data.match.radiant_team}
                direTeam={query.data.match.dire_team}
              />
              <Text className="text-sm text-slate-300">{formatDate(query.data.match.scheduled_at)}</Text>
              <Text className="text-sm text-slate-400">
                Best of {query.data.match.best_of}
                {query.data.match.tournament ? ` · ${query.data.match.tournament.name}` : ''}
              </Text>
              {query.data.match.gameweek_id ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/gameweek/${query.data.match.gameweek_id}`)}
                >
                  <Text className="font-semibold text-cyan-300">View gameweek details</Text>
                </Pressable>
              ) : null}
              {query.data.match.tournament ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/tournament/${query.data.match.tournament?.id}`)}
                >
                  <Text className="font-semibold text-cyan-300">View tournament</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Personalized User Fantasy Impact Banner */}
            <MatchFantasyImpactBanner
              impact={query.data.userFantasyImpact}
              playerStats={query.data.playerStats}
              fantasyPointsByPlayer={fantasyPointsByPlayer}
              gameweekId={query.data.match.gameweek_id}
            />

            {/* Match Highlight Leaders Strip */}
            <MatchLeadersStrip
              fantasyMVP={fantasyMVP}
              highestDamage={highestDamage}
              highestGPM={highestGPM}
              highestKills={highestKills}
            />

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
              {query.data.playerStats.length ? (
                query.data.playerStats.map((player) => {
                  const pName = cleanPlayerName(player);
                  const lineup = lineupDetailMap.get(player.player_id);
                  const isOwned = ownedSet.has(player.player_id);
                  const fBreakdown = query.data?.fantasyBreakdown.find((b) => b.player_id === player.player_id);
                  const totalPts = fBreakdown?.total_points ?? fantasyPointsByPlayer.get(player.player_id);

                  return (
                    <Pressable
                      key={player.id}
                      accessibilityRole="button"
                      className="gap-2.5 rounded-xl border border-slate-800 bg-slate-900 p-4"
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
                          {isOwned && !lineup && (
                            <View className="bg-emerald-950 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] font-semibold text-emerald-300">OWNED</Text>
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
                  <Text className="text-sm text-slate-400">Player statistics have not been published for this match.</Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
