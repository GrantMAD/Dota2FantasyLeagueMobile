export type MatchListFilter = 'all' | 'live' | 'upcoming' | 'completed';

export function getMatchRefreshInterval(
  filter: MatchListFilter,
  liveMatchCount: number,
): number | false {
  if (filter !== 'all' && filter !== 'live') return false;
  return liveMatchCount > 0 ? 60_000 : 5 * 60_000;
}

export function getActiveMatchFilterCount({
  filter,
  tournamentId,
  search,
  gameweekId,
}: {
  filter: MatchListFilter;
  tournamentId: number | null;
  search: string;
  gameweekId: number | undefined;
}): number {
  return Number(filter !== 'all')
    + Number(tournamentId !== null)
    + Number(search.trim() !== '')
    + Number(gameweekId !== undefined);
}
