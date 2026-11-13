import type { MatchSummary } from './api';

export interface MatchSeriesGroup {
  key: string;
  match: MatchSummary;
  games: MatchSummary[];
}

export interface MatchSeriesScore {
  radiantWins: number;
  direWins: number;
  completedGames: number;
  clinchedTeamId: number | null;
  isComplete: boolean;
  isLive: boolean;
}

export function getCompletedGamesAwaitingPlayerStats(games: MatchSummary[]): MatchSummary[] {
  return games.filter((game) => game.status === 'completed' && game.player_ids.length === 0);
}

export function getMatchSeriesKey(match: MatchSummary): string {
  if (
    match.series_id == null ||
    match.gameweek_id == null ||
    match.radiant_team_id == null ||
    match.dire_team_id == null
  ) {
    return `match:${match.id}`;
  }

  const [teamLowId, teamHighId] = [match.radiant_team_id, match.dire_team_id]
    .sort((left, right) => left - right);
  return `series:${match.series_id}:gameweek:${match.gameweek_id}:teams:${teamLowId}:${teamHighId}`;
}

export function getDefaultSeriesGame<T extends { match_number?: number }>(games: T[]): T | undefined {
  return games.find((game) => game.match_number === 1) ?? games[0];
}

export function groupMatchesBySeries(matches: MatchSummary[]): MatchSeriesGroup[] {
  const groups = new Map<string, MatchSeriesGroup>();

  for (const match of matches) {
    const key = getMatchSeriesKey(match);
    const group = groups.get(key) ?? { key, match, games: [] };
    groups.set(key, group);

    for (const game of match.series_matches?.length ? match.series_matches : [match]) {
      if (getMatchSeriesKey(game) !== key) continue;
      if (!group.games.some((existing) => existing.id === game.id)) {
        group.games.push(game);
      }
    }
  }

  return [...groups.values()].map((group) => {
    const games = group.games.sort((left, right) => (
      left.scheduled_at.localeCompare(right.scheduled_at) || left.id - right.id
    ));
    return {
      ...group,
      match: games[0] ?? group.match,
      games,
    };
  });
}

export function shouldShowMatchSeries(games: MatchSummary[]): boolean {
  return games.some((game) => game.status !== 'completed' || game.player_ids.length > 0);
}

export function summarizeMatchSeries(games: MatchSummary[]): MatchSeriesScore {
  const firstGame = games[0];
  const completedGames = games.filter((game) => game.status === 'completed');
  const radiantWins = firstGame?.radiant_team_id == null
    ? 0
    : completedGames.filter((game) => game.winner_team_id === firstGame.radiant_team_id).length;
  const direWins = firstGame?.dire_team_id == null
    ? 0
    : completedGames.filter((game) => game.winner_team_id === firstGame.dire_team_id).length;
  const clinchThreshold = Math.floor((firstGame?.best_of ?? 3) / 2) + 1;
  const clinchedTeamId = radiantWins >= clinchThreshold
    ? firstGame?.radiant_team_id ?? null
    : direWins >= clinchThreshold
      ? firstGame?.dire_team_id ?? null
      : null;

  return {
    radiantWins,
    direWins,
    completedGames: completedGames.length,
    clinchedTeamId,
    isComplete: clinchedTeamId !== null || (games.length > 0 && completedGames.length === games.length),
    isLive: games.some((game) => game.status === 'live'),
  };
}
