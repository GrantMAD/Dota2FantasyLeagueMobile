import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { TeamLogo } from '@/src/components/TeamLogo';
import type { MatchSummary } from './api';

interface CompetingTeam {
  id: number;
  name: string;
  tag: string;
  logo_url?: string | null;
}

interface TournamentGroupStandingsProps {
  matches: MatchSummary[];
  competingTeams: CompetingTeam[];
}

interface TeamStandingRow {
  teamId: number;
  name: string;
  tag: string;
  logoUrl?: string | null;
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
        logoUrl: t.logo_url,
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

      {/* Standings Cards List (Two rows per team card for full name visibility) */}
      <View className="gap-2.5">
        {standings.map((row, idx) => {
          const rank = idx + 1;
          const isUpper = rank <= 4;
          const isLower = rank > 4 && rank <= 8;

          return (
            <View
              key={row.teamId}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
            >
              {/* Row 1: Rank Badge, Logo, Team Name & Points */}
              <View className="flex-row items-center justify-between border-b border-slate-800/70 bg-slate-950/40 px-3.5 py-2.5">
                <View className="flex-1 min-w-0 flex-row items-center gap-2.5 pr-2">
                  {/* Rank Position Pill */}
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-md border ${
                      isUpper
                        ? 'border-emerald-500/40 bg-emerald-500/15'
                        : isLower
                          ? 'border-cyan-500/40 bg-cyan-500/15'
                          : 'border-slate-800 bg-slate-950'
                    }`}
                  >
                    <Text
                      className={`font-mono text-xs font-black ${
                        isUpper ? 'text-emerald-400' : isLower ? 'text-cyan-300' : 'text-slate-400'
                      }`}
                    >
                      {rank}
                    </Text>
                  </View>

                  {/* Team Logo */}
                  <TeamLogo logoUrl={row.logoUrl} name={row.name} tag={row.tag} size={28} />

                  {/* Team Name and Tag */}
                  <View className="flex-1 min-w-0">
                    <Text numberOfLines={1} className="text-xs font-bold text-white leading-4">
                      {row.name}
                    </Text>
                    <Text className="text-[10px] font-mono text-cyan-300 font-medium">
                      {row.tag}
                    </Text>
                  </View>
                </View>

                {/* Points Badge */}
                <View className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 items-center">
                  <Text className="font-mono text-xs font-black text-cyan-300">
                    {row.points} <Text className="text-[9px] font-semibold text-slate-400 uppercase">pts</Text>
                  </Text>
                </View>
              </View>

              {/* Row 2: Secondary Stats Strip (Played, W-D-L, Diff, Win %) */}
              <View className="flex-row items-center justify-between px-3.5 py-2 bg-slate-900">
                {/* Played */}
                <View className="items-center flex-1">
                  <Text className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
                    Played
                  </Text>
                  <Text className="font-mono text-xs font-bold text-slate-300 mt-0.5">
                    {row.seriesPlayed}
                  </Text>
                </View>

                <View className="h-4 w-px bg-slate-800" />

                {/* Series Record */}
                <View className="items-center flex-1">
                  <Text className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
                    W-D-L
                  </Text>
                  <Text className="font-mono text-xs font-bold text-white mt-0.5">
                    {row.seriesWon}-{row.seriesDrawn}-{row.seriesLost}
                  </Text>
                </View>

                <View className="h-4 w-px bg-slate-800" />

                {/* Game Differential */}
                <View className="items-center flex-1">
                  <Text className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
                    Diff
                  </Text>
                  <Text
                    className={`font-mono text-xs font-bold mt-0.5 ${
                      row.gameDiff > 0
                        ? 'text-emerald-400'
                        : row.gameDiff < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {row.gameDiff > 0 ? `+${row.gameDiff}` : row.gameDiff}
                  </Text>
                </View>

                <View className="h-4 w-px bg-slate-800" />

                {/* Win Rate */}
                <View className="items-center flex-1">
                  <Text className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
                    Win Rate
                  </Text>
                  <Text className="font-mono text-xs font-bold text-slate-300 mt-0.5">
                    {row.winRate}%
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
