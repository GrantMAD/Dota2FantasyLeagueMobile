import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { MatchSummary } from './api';

interface TournamentSeriesTimelineProps {
  matches: MatchSummary[];
  onMatchPress?: (matchId: number) => void;
}

interface SeriesNode {
  key: string;
  teamAId: number;
  teamBId: number;
  teamAName: string;
  teamATag: string;
  teamBName: string;
  teamBTag: string;
  scoreA: number;
  scoreB: number;
  winnerTeamId: number | null;
  status: 'live' | 'completed' | 'scheduled';
  bestOf: number;
  scheduledAt: string | null;
  firstMatchId: number | undefined;
}

interface DayGroup {
  day: string;
  dateLabel: string;
  series: SeriesNode[];
}

export function TournamentSeriesTimeline({ matches, onMatchPress }: TournamentSeriesTimelineProps) {
  const dayGroups = useMemo<DayGroup[]>(() => {
    if (!matches || matches.length === 0) return [];

    // 1. Sort matches chronologically
    const sorted = [...matches].sort((a, b) => {
      const tA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const tB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return tA - tB;
    });

    // 2. Cluster games into distinct BoX series encounters
    type Cluster = {
      key: string;
      teamAId: number;
      teamBId: number;
      startTime: number;
      endTime: number;
      matches: MatchSummary[];
    };

    const clusters: Cluster[] = [];
    let cur: Cluster | null = null;

    for (const m of sorted) {
      const aId = m.radiant_team_id;
      const bId = m.dire_team_id;
      if (!aId || !bId) continue;

      const lowId = Math.min(aId, bId);
      const highId = Math.max(aId, bId);
      const key = `${lowId}-${highId}`;
      const time = m.scheduled_at ? new Date(m.scheduled_at).getTime() : 0;

      if (!cur) {
        cur = { key, teamAId: lowId, teamBId: highId, startTime: time, endTime: time, matches: [m] };
      } else if (cur.key === key && time - cur.endTime < 1000 * 60 * 60 * 10) {
        cur.endTime = time;
        cur.matches.push(m);
      } else {
        clusters.push(cur);
        cur = { key, teamAId: lowId, teamBId: highId, startTime: time, endTime: time, matches: [m] };
      }
    }
    if (cur) clusters.push(cur);

    // 3. Convert clusters into SeriesNode
    const nodes: SeriesNode[] = clusters.map((cluster) => {
      // Find team details from radiant_team / dire_team
      let teamAName = 'Team ' + cluster.teamAId;
      let teamATag = 'TBA';
      let teamBName = 'Team ' + cluster.teamBId;
      let teamBTag = 'TBA';

      for (const m of cluster.matches) {
        if (m.radiant_team_id === cluster.teamAId && m.radiant_team) {
          teamAName = m.radiant_team.name;
          teamATag = m.radiant_team.tag;
        } else if (m.dire_team_id === cluster.teamAId && m.dire_team) {
          teamAName = m.dire_team.name;
          teamATag = m.dire_team.tag;
        }

        if (m.radiant_team_id === cluster.teamBId && m.radiant_team) {
          teamBName = m.radiant_team.name;
          teamBTag = m.radiant_team.tag;
        } else if (m.dire_team_id === cluster.teamBId && m.dire_team) {
          teamBName = m.dire_team.name;
          teamBTag = m.dire_team.tag;
        }
      }

      let scoreA = 0;
      let scoreB = 0;
      let hasLive = false;
      let allCompleted = true;
      const bestOf = cluster.matches[0]?.best_of || (cluster.matches.length >= 3 ? 3 : 2);

      for (const m of cluster.matches) {
        if (m.status === 'live' || m.status === 'in_progress') hasLive = true;
        if (m.status !== 'completed') allCompleted = false;

        if (m.winner_team_id !== null && Number(m.winner_team_id) === Number(cluster.teamAId)) scoreA++;
        else if (m.winner_team_id !== null && Number(m.winner_team_id) === Number(cluster.teamBId)) scoreB++;
      }

      const winsNeeded = Math.ceil(bestOf / 2);
      let winnerTeamId: number | null = null;
      if (scoreA >= winsNeeded) winnerTeamId = cluster.teamAId;
      else if (scoreB >= winsNeeded) winnerTeamId = cluster.teamBId;

      let status: 'live' | 'completed' | 'scheduled' = 'scheduled';
      if (hasLive) status = 'live';
      else if (winnerTeamId || (allCompleted && cluster.matches.length > 0)) status = 'completed';

      return {
        key: cluster.key + '-' + cluster.startTime,
        teamAId: cluster.teamAId,
        teamBId: cluster.teamBId,
        teamAName,
        teamATag,
        teamBName,
        teamBTag,
        scoreA,
        scoreB,
        winnerTeamId,
        status,
        bestOf,
        scheduledAt: cluster.matches[0]?.scheduled_at || null,
        firstMatchId: cluster.matches[0]?.id,
      };
    });

    // 4. Group by calendar date
    const dayMap = new Map<string, SeriesNode[]>();
    for (const node of nodes) {
      const day = node.scheduledAt ? node.scheduledAt.slice(0, 10) : 'unknown';
      const arr = dayMap.get(day) || [];
      arr.push(node);
      dayMap.set(day, arr);
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, seriesNodes]) => {
        const date = new Date(day + 'T12:00:00Z');
        const dateLabel = date.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        return { day, dateLabel, series: seriesNodes };
      });
  }, [matches]);

  if (dayGroups.length === 0) {
    return (
      <View className="rounded-2xl border border-slate-800 bg-slate-900 p-6 items-center justify-center">
        <Text className="text-sm font-semibold text-white">No Series Data Yet</Text>
        <Text className="mt-1 text-xs text-slate-400 text-center">
          Series results will appear here once matches have been played.
        </Text>
      </View>
    );
  }

  const totalSeries = dayGroups.reduce((acc, g) => acc + g.series.length, 0);

  return (
    <View className="gap-5">
      {/* Header Info Banner */}
      <View className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <View>
          <Text className="text-xs font-bold text-white">Series Results Timeline</Text>
          <Text className="text-[10px] text-slate-400">
            {totalSeries} series across {dayGroups.length} match day{dayGroups.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
            <Text className="text-[10px] font-medium text-slate-400">Winner</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-rose-500" />
            <Text className="text-[10px] font-medium text-slate-400">Live</Text>
          </View>
        </View>
      </View>

      {/* Days & Matchup Cards */}
      {dayGroups.map((group, gIdx) => (
        <View key={group.day} className="gap-2.5">
          {/* Day Separator Header */}
          <View className="flex-row items-center gap-2 px-1">
            <View className="rounded-lg bg-slate-800 px-2.5 py-1">
              <Text className="text-xs font-bold text-cyan-300">{group.dateLabel}</Text>
            </View>
            <View className="flex-1 h-px bg-slate-800" />
            <Text className="text-[10px] font-medium text-slate-500">
              Day {gIdx + 1} · {group.series.length} series
            </Text>
          </View>

          {/* Series Cards */}
          {group.series.map((node) => {
            const isLive = node.status === 'live';
            const isCompleted = node.status === 'completed';
            const teamAWon = node.winnerTeamId !== null && node.winnerTeamId === node.teamAId;
            const teamBWon = node.winnerTeamId !== null && node.winnerTeamId === node.teamBId;

            return (
              <Pressable
                key={node.key}
                accessibilityRole="button"
                className={`overflow-hidden rounded-2xl border ${
                  isLive ? 'border-rose-500/60 bg-slate-900' : 'border-slate-800 bg-slate-900'
                }`}
                onPress={() => node.firstMatchId && onMatchPress?.(node.firstMatchId)}
              >
                {/* Series Card Top Header */}
                <View className="flex-row items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-3.5 py-1.5">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Bo{node.bestOf} Series
                  </Text>
                  {isLive ? (
                    <View className="flex-row items-center gap-1">
                      <View className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <Text className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Live</Text>
                    </View>
                  ) : isCompleted ? (
                    <Text className="text-[10px] font-bold text-emerald-400">Final</Text>
                  ) : (
                    <Text className="text-[10px] text-slate-500">Scheduled</Text>
                  )}
                </View>

                {/* Team A Row */}
                <View
                  className={`flex-row items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5 ${
                    teamAWon ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-2 flex-1 pr-2">
                    <View className="h-7 w-7 items-center justify-center rounded-lg bg-slate-950 border border-slate-800">
                      <Text className="text-[10px] font-black text-cyan-400 font-mono">
                        {(node.teamATag || node.teamAName).substring(0, 3).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      className={`text-xs ${teamAWon ? 'font-black text-emerald-300' : 'font-semibold text-white'}`}
                    >
                      {node.teamAName}
                    </Text>
                  </View>
                  <View
                    className={`min-w-6 items-center justify-center rounded-md px-2 py-0.5 ${
                      teamAWon ? 'bg-emerald-500/20' : 'bg-slate-950'
                    }`}
                  >
                    <Text
                      className={`font-mono text-xs font-black ${
                        teamAWon ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {node.scoreA}
                    </Text>
                  </View>
                </View>

                {/* Team B Row */}
                <View
                  className={`flex-row items-center justify-between px-3.5 py-2.5 ${
                    teamBWon ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-2 flex-1 pr-2">
                    <View className="h-7 w-7 items-center justify-center rounded-lg bg-slate-950 border border-slate-800">
                      <Text className="text-[10px] font-black text-cyan-400 font-mono">
                        {(node.teamBTag || node.teamBName).substring(0, 3).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      className={`text-xs ${teamBWon ? 'font-black text-emerald-300' : 'font-semibold text-white'}`}
                    >
                      {node.teamBName}
                    </Text>
                  </View>
                  <View
                    className={`min-w-6 items-center justify-center rounded-md px-2 py-0.5 ${
                      teamBWon ? 'bg-emerald-500/20' : 'bg-slate-950'
                    }`}
                  >
                    <Text
                      className={`font-mono text-xs font-black ${
                        teamBWon ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {node.scoreB}
                    </Text>
                  </View>
                </View>

                {/* Card Footer prompt */}
                {node.firstMatchId ? (
                  <View className="flex-row items-center justify-between border-t border-slate-800/80 bg-slate-950/40 px-3.5 py-1.5">
                    <Text className="text-[10px] text-brand-300">View match details</Text>
                    <Text className="text-[10px] text-brand-300">›</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

