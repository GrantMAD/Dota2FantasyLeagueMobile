import type { MatchDetails, UserFantasyImpact } from './api';

export interface SeriesGameValue {
  matchId: number;
  matchNumber: number;
  scheduledAt: string;
  value: number;
  formattedValue: string;
}

export interface SeriesLeader {
  playerId: number;
  playerName: string;
  heroName: string | null;
  role: string;
  value: number;
  formattedValue: string;
  gameValues: SeriesGameValue[];
}

export interface SeriesPlayerGameImpact {
  matchId: number;
  matchNumber: number;
  scheduledAt: string;
  fantasyPoints: number;
  effectivePoints: number;
}

export interface SeriesPlayerImpact {
  playerId: number;
  playerName: string;
  heroName: string | null;
  slot: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarter: boolean;
  multiplier: number;
  fantasyPoints: number;
  effectivePoints: number;
  gamesPlayed: number;
  gameValues: SeriesPlayerGameImpact[];
}

function playerKey(stat: MatchDetails['playerStats'][number]): string {
  return stat.series_player_key ?? `player:${stat.player_id}`;
}

function playerName(stat: MatchDetails['playerStats'][number]): string {
  const raw = stat.player?.in_game_name || stat.player?.name || '';
  if (!raw || /^Player\s*\(/i.test(raw)) {
    if (stat.hero_name && stat.hero_name.toLowerCase() !== 'unknown' && !/^Hero\s+\d+$/i.test(stat.hero_name)) {
      return stat.hero_name;
    }
    return `Player #${stat.player_id}`;
  }
  return raw;
}

function formatLeaderValue(metric: 'fantasy' | 'damage' | 'economy' | 'kills', value: number): string {
  switch (metric) {
    case 'fantasy':
      return `${value.toFixed(1)} pts`;
    case 'damage':
      return Math.round(value).toLocaleString();
    case 'economy':
      return `~${Math.round(value).toLocaleString()} gold`;
    case 'kills':
      return `${value} kills`;
  }
}

export function calculateSeriesLeaders(games: MatchDetails[]): {
  fantasyMVP: SeriesLeader | null;
  highestDamage: SeriesLeader | null;
  highestEconomy: SeriesLeader | null;
  highestKills: SeriesLeader | null;
} {
  const totalsByPlayer = new Map<string, {
    playerId: number;
    playerName: string;
    heroName: string | null;
    role: string;
    fantasy: number;
    damage: number;
    economy: number;
    kills: number;
    gameValues: {
      matchId: number;
      matchNumber: number;
      scheduledAt: string;
      fantasy: number;
      damage: number;
      economy: number;
      kills: number;
    }[];
  }>();

  for (const [index, game] of games.entries()) {
    const statsByKey = new Map<string, MatchDetails['playerStats'][number]>();
    const keyByPlayerId = new Map<number, string>();
    for (const stat of game.playerStats) {
      const key = playerKey(stat);
      statsByKey.set(key, stat);
      keyByPlayerId.set(stat.player_id, key);
    }

    const fantasyByKey = new Map<string, number>();
    for (const breakdown of game.fantasyBreakdown) {
      const key = keyByPlayerId.get(breakdown.player_id) ?? `player:${breakdown.player_id}`;
      fantasyByKey.set(key, (fantasyByKey.get(key) ?? 0) + Number(breakdown.total_points ?? 0));
    }

    const matchNumber = game.match.match_number || index + 1;
    const scheduledAt = game.match.scheduled_at;
    for (const [key, stat] of statsByKey) {
      const fantasy = fantasyByKey.get(key) ?? 0;
      const damage = Number(stat.hero_damage ?? 0);
      const kills = Number(stat.kills ?? 0);
      const duration = Math.max(0, game.match.duration_seconds ?? 0);
      const gpm = Number(stat.gold_per_minute ?? 0);
      const economy = duration > 0 && gpm > 0 ? gpm * duration / 60 : 0;
      const current = totalsByPlayer.get(key) ?? {
        playerId: stat.player_id,
        playerName: playerName(stat),
        heroName: stat.hero_name,
        role: 'Core',
        fantasy: 0,
        damage: 0,
        economy: 0,
        kills: 0,
        gameValues: [],
      };

      current.fantasy += fantasy;
      current.damage += damage;
      current.economy += economy;
      current.kills += kills;
      current.gameValues.push({
        matchId: game.match.id,
        matchNumber,
        scheduledAt,
        fantasy,
        damage,
        economy,
        kills,
      });
      totalsByPlayer.set(key, current);
    }
  }

  const totals = [...totalsByPlayer.values()];
  const leader = (
    metric: 'fantasy' | 'damage' | 'economy' | 'kills',
    available: (value: number) => boolean = () => true,
  ): SeriesLeader | null => {
    const player = totals
      .filter((candidate) => available(candidate[metric]))
      .reduce<(typeof totals)[number] | null>(
        (best, candidate) => best === null || candidate[metric] > best[metric] ? candidate : best,
        null,
      );
    if (!player) return null;

    const value = player[metric];
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      heroName: player.heroName,
      role: player.role,
      value,
      formattedValue: formatLeaderValue(metric, value),
      gameValues: player.gameValues.map((game) => ({
        matchId: game.matchId,
        matchNumber: game.matchNumber,
        scheduledAt: game.scheduledAt,
        value: game[metric],
        formattedValue: formatLeaderValue(metric, game[metric]),
      })),
    };
  };

  return {
    fantasyMVP: leader('fantasy'),
    highestDamage: leader('damage'),
    highestEconomy: leader('economy', (value) => value > 0),
    highestKills: leader('kills'),
  };
}

export function calculateSeriesFantasyImpact(
  games: MatchDetails[],
  impact: UserFantasyImpact | null | undefined,
): { players: SeriesPlayerImpact[]; totalEffectivePoints: number } {
  if (!impact) return { players: [], totalEffectivePoints: 0 };

  const ownedIds = new Set(impact.userOwnedPlayerIds);
  const lineupByPlayerId = new Map(impact.lineupDetails.map((detail) => [detail.playerId, detail]));
  const playersByKey = new Map<string, SeriesPlayerImpact>();

  games.forEach((game, gameIndex) => {
    const statsByKey = new Map<string, MatchDetails['playerStats'][number]>();
    const keyByPlayerId = new Map<number, string>();
    for (const stat of game.playerStats) {
      const key = playerKey(stat);
      statsByKey.set(key, stat);
      keyByPlayerId.set(stat.player_id, key);
    }

    const pointsByKey = new Map<string, number>();
    for (const breakdown of game.fantasyBreakdown) {
      const key = keyByPlayerId.get(breakdown.player_id) ?? `player:${breakdown.player_id}`;
      pointsByKey.set(key, (pointsByKey.get(key) ?? 0) + Number(breakdown.total_points ?? 0));
    }

    for (const [key, stat] of statsByKey) {
      const isOwned = ownedIds.has(stat.player_id);
      const lineup = lineupByPlayerId.get(stat.player_id);
      if (!isOwned && !lineup) continue;

      const multiplier = lineup?.isCaptain
        ? (impact.tripleCaptainActive ? 3 : 2)
        : !lineup?.isStarter ? 0 : 1;
      const fantasyPoints = pointsByKey.get(key) ?? 0;
      const gameNumber = game.match.match_number || gameIndex + 1;
      const gameValue: SeriesPlayerGameImpact = {
        matchId: game.match.id,
        matchNumber: gameNumber,
        scheduledAt: game.match.scheduled_at,
        fantasyPoints,
        effectivePoints: fantasyPoints * multiplier,
      };
      const existing = playersByKey.get(key);
      if (existing) {
        existing.fantasyPoints += fantasyPoints;
        existing.effectivePoints += gameValue.effectivePoints;
        existing.gamesPlayed += 1;
        existing.gameValues.push(gameValue);
        continue;
      }

      playersByKey.set(key, {
        playerId: stat.player_id,
        playerName: playerName(stat),
        heroName: stat.hero_name,
        slot: lineup?.slot ?? 'Squad Roster',
        isCaptain: Boolean(lineup?.isCaptain),
        isViceCaptain: Boolean(lineup?.isViceCaptain),
        isStarter: Boolean(lineup?.isStarter),
        multiplier,
        fantasyPoints,
        effectivePoints: gameValue.effectivePoints,
        gamesPlayed: 1,
        gameValues: [gameValue],
      });
    }
  });

  const players = [...playersByKey.values()];
  return {
    players,
    totalEffectivePoints: players.reduce((total, player) => total + player.effectivePoints, 0),
  };
}
