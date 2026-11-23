import { getActiveMatchFilterCount, getMatchRefreshInterval } from '@/src/features/competition/match-list-state';

describe('getMatchRefreshInterval', () => {
  it('refreshes All and Live views more frequently while live matches exist', () => {
    expect(getMatchRefreshInterval('all', 1)).toBe(60_000);
    expect(getMatchRefreshInterval('live', 3)).toBe(60_000);
    expect(getMatchRefreshInterval('all', 0)).toBe(5 * 60_000);
  });

  it('does not poll upcoming or completed views', () => {
    expect(getMatchRefreshInterval('upcoming', 2)).toBe(false);
    expect(getMatchRefreshInterval('completed', 2)).toBe(false);
  });
});

describe('getActiveMatchFilterCount', () => {
  it('counts status, tournament, search, and gameweek filters', () => {
    expect(getActiveMatchFilterCount({
      filter: 'live',
      tournamentId: 12,
      search: ' Team Spirit ',
      gameweekId: 5,
    })).toBe(4);
  });

  it('ignores default, unselected, and whitespace-only filters', () => {
    expect(getActiveMatchFilterCount({
      filter: 'all',
      tournamentId: null,
      search: '   ',
      gameweekId: undefined,
    })).toBe(0);
  });
});
