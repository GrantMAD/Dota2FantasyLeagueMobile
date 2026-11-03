import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { MatchSummary } from './api';

interface CompetingTeam {
  id: number;
  name: string;
  tag: string;
}

interface TournamentGroupStandingsProps {
  matches: MatchSummary[];
  competingTeams: CompetingTeam[];
}

interface TeamStandingRow {
  teamId: number;
  name: string;
  tag: string;
  seriesPlayed: number;
  seriesWon: number;
  seriesDrawn: number;
  seriesLost: number;
  gamesWon: number;
  gamesLost: number;
  gameDiff: number;
  points: number;
  winRate: number;
}

export function TournamentGroupStandings({ matches, competingTeams }: TournamentGroupStandingsProps) {
  const standings = useMemo<TeamStandingRow[]>(() => {
    if (!competingTeams || competingTeams.length === 0) return [];

    const statsMap = new Map<number, TeamStandingRow>();
    for (const t of competingTeams) {
      statsMap.set(t.id, {
        teamId: t.id,
        name: t.name,
        tag: t.tag || t.name.substring(0, 4).toUpperCase(),
        seriesPlayed: 0,
        seriesWon: 0,
        seriesDrawn: 0,
        seriesLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        gameDiff: 0,
        points: 0,
        winRate: 0,
      });
    }

    // Group matches by unique matchup pairs: pairKey -> MatchSummary[]
    const matchupGames = new Map<string, { teamAId: number; teamBId: number; matches: MatchSummary[] }>();

    for (const m of matches) {
      const aId = m.radiant_team_id;
      const bId = m.dire_team_id;
      if (!aId || !bId) continue;

      const lowId = Math.min(aId, bId);
      const highId = Math.max(aId, bId);
      const pairKey = `${lowId}-${highId}`;

      const pair = matchupGames.get(pairKey) || { teamAId: lowId, teamBId: highId, matches: [] };
      pair.matches.push(m);
      matchupGames.set(pairKey, pair);
    }

    // Compute records per head-to-head matchup
    for (const { teamAId, teamBId, matches: pairMatches } of matchupGames.values()) {
      let gamesWonA = 0;
      let gamesWonB = 0;
      let hasCompleted = false;

      for (const m of pairMatches) {
        if (m.status === 'completed' || m.winner_team_id) {
          hasCompleted = true;
          if (m.winner_team_id !== null && Number(m.winner_team_id) === Number(teamAId)) gamesWonA++;
          else if (m.winner_team_id !== null && Number(m.winner_team_id) === Number(teamBId)) gamesWonB++;
        }
      }

      const statsA = statsMap.get(teamAId);
      const statsB = statsMap.get(teamBId);

      if (statsA) {
        statsA.gamesWon += gamesWonA;
        statsA.gamesLost += gamesWonB;
      }
      if (statsB) {
        statsB.gamesWon += gamesWonB;
        statsB.gamesLost += gamesWonA;
      }

      if (hasCompleted) {
        if (statsA) statsA.seriesPlayed += 1;
        if (statsB) statsB.seriesPlayed += 1;

        if (gamesWonA > gamesWonB) {
          if (statsA) statsA.seriesWon += 1;
          if (statsB) statsB.seriesLost += 1;
        } else if (gamesWonB > gamesWonA) {
          if (statsB) statsB.seriesWon += 1;
          if (statsA) statsA.seriesLost += 1;
        } else {
          // Drawn (Bo2 tie)
          if (statsA) statsA.seriesDrawn += 1;
          if (statsB) statsB.seriesDrawn += 1;
        }
      }
    }

    // Compute points: 3 pts per win, 1 pt per draw
    const rows = Array.from(statsMap.values()).map((s) => {
      const points = s.seriesWon * 3 + s.seriesDrawn * 1;
      const totalGames = s.gamesWon + s.gamesLost;
      const winRate = totalGames > 0 ? Math.round((s.gamesWon / totalGames) * 100) : 0;
      const gameDiff = s.gamesWon - s.gamesLost;

      return {
        ...s,
        points,
        winRate,
        gameDiff,
      };
    });

    // Sort by points desc, gameDiff desc, gamesWon desc, name asc
    return rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.name.localeCompare(b.name);
    });
  }, [matches, competingTeams]);

  if (standings.length === 0) {
    return (
      <View className="rounded-2xl border border-slate-800 bg-slate-900 p-6 items-center justify-center">
        <Text className="text-sm font-semibold text-white">No Standings Available</Text>
        <Text className="mt-1 text-xs text-slate-400 text-center">
          Group stage records will compute as matches are completed.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {/* Legend & Scoring Rules Header */}
      <View className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold text-white">Group Stage Table</Text>
          <Text className="text-[10px] text-slate-400">3 pts win · 1 pt draw</Text>
        </View>
        <View className="flex-row items-center gap-3 pt-1 border-t border-slate-800/80">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
            <Text className="text-[10px] text-slate-400">Upper Bracket (1-4)</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-cyan-400" />
            <Text className="text-[10px] text-slate-400">Lower Bracket (5-8)</Text>
          </View>
        </View>
      </View>

      {/* Standings Table Card */}
      <View className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {/* Table Column Headers */}
        <View className="flex-row items-center border-b border-slate-800 bg-slate-950/70 px-3 py-2">
          <Text className="w-8 text-[10px] font-bold text-slate-500 uppercase">#</Text>
          <Text className="flex-1 text-[10px] font-bold text-slate-500 uppercase">Team</Text>
          <Text className="w-10 text-center text-[10px] font-bold text-slate-500 uppercase">P</Text>
          <Text className="w-14 text-center text-[10px] font-bold text-slate-500 uppercase">W-D-L</Text>
          <Text className="w-10 text-center text-[10px] font-bold text-slate-500 uppercase">Diff</Text>
          <Text className="w-10 text-right text-[10px] font-bold text-slate-400 uppercase">Pts</Text>
        </View>

        {/* Rows */}
        {standings.map((row, idx) => {
          const rank = idx + 1;
          const isUpper = rank <= 4;
          const isLower = rank > 4 && rank <= 8;

          return (
            <View
              key={row.teamId}
              className={`flex-row items-center px-3 py-2.5 border-b border-slate-800/50 ${
                idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/60'
              }`}
            >
              {/* Rank Position with Indicator */}
              <View className="w-8 flex-row items-center gap-1">
                <View
                  className={`h-3 w-1 rounded-full ${
                    isUpper ? 'bg-emerald-500' : isLower ? 'bg-cyan-400' : 'bg-transparent'
                  }`}
                />
                <Text
                  className={`text-xs font-bold font-mono ${
                    isUpper ? 'text-emerald-400' : isLower ? 'text-cyan-300' : 'text-slate-500'
                  }`}
                >
                  {rank}
                </Text>
              </View>

              {/* Team Info */}
              <View className="flex-1 flex-row items-center gap-1.5 pr-1">
                <View className="h-5 w-7 items-center justify-center rounded bg-slate-950 border border-slate-800">
                  <Text className="text-[9px] font-black text-cyan-400 font-mono">
                    {row.tag.substring(0, 3).toUpperCase()}
                  </Text>
                </View>
                <Text numberOfLines={1} className="flex-1 text-xs font-semibold text-white">
                  {row.name}
                </Text>
              </View>

              {/* Played */}
              <Text className="w-10 text-center font-mono text-xs text-slate-400">
                {row.seriesPlayed}
              </Text>

              {/* Series Record (W-D-L) */}
              <Text className="w-14 text-center font-mono text-[11px] text-slate-300 font-medium">
                {row.seriesWon}-{row.seriesDrawn}-{row.seriesLost}
              </Text>

              {/* Differential */}
              <Text
                className={`w-10 text-center font-mono text-xs font-semibold ${
                  row.gameDiff > 0
                    ? 'text-emerald-400'
                    : row.gameDiff < 0
                    ? 'text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {row.gameDiff > 0 ? `+${row.gameDiff}` : `${row.gameDiff}`}
              </Text>

              {/* Points */}
              <Text className="w-10 text-right font-mono text-xs font-black text-white">
                {row.points}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

