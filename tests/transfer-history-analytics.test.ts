import { calculateTransferHistoryAnalytics } from '../src/features/fantasy/transfer-history-analytics';

const weeks = [
  { id: 1, seasonId: 3, gameweekNumber: 1, status: 'closed', endDate: '2026-10-10T23:59:59Z' },
  { id: 2, seasonId: 3, gameweekNumber: 2, status: 'closed', endDate: '2026-10-17T23:59:59Z' },
  { id: 3, seasonId: 3, gameweekNumber: 3, status: 'locked', endDate: '2026-10-24T23:59:59Z' },
  { id: 4, seasonId: 3, gameweekNumber: 4, status: 'open', endDate: '2026-10-31T23:59:59Z' },
];

const baseTransfer = {
  id: 15,
  createdAt: '2026-10-07T10:00:00Z',
  fantasySeasonId: 9,
  seasonId: 3,
  gameweekId: 1,
  gameweekNumber: 1,
  penaltyPoints: 0,
  budgetImpact: null,
  moves: [{
    playerOutId: 10,
    playerInId: 20,
    playerOut: 'Outgoing',
    playerIn: 'Incoming',
    budgetImpact: null,
    netPointsNextThreeGameweeks: null,
    scoredGameweeks: 0,
    scoringGameweeks: [],
  }],
};

describe('calculateTransferHistoryAnalytics', () => {
  it('uses the matched acquisition and removal costs and sums completed-gameweek point differences', () => {
    const result = calculateTransferHistoryAnalytics({
      transfers: [baseTransfer],
      members: [
        { fantasySeasonId: 9, playerId: 10, cost: 12, acquiredAt: '2026-09-01T00:00:00Z', removedAt: '2026-10-07T10:00:30Z' },
        { fantasySeasonId: 9, playerId: 20, cost: 10, acquiredAt: '2026-10-07T10:00:00Z', removedAt: null },
      ],
      gameweeks: weeks,
      scores: [
        { playerId: 10, gameweekId: 1, points: 3 },
        { playerId: 20, gameweekId: 1, points: 8 },
      ],
      prices: [],
      currentFantasySeasonId: 9,
      currentSeasonId: 3,
    });

    expect(result.transfers[0].budgetImpact).toBe(2);
    expect(result.transfers[0].moves[0].netPointsNextThreeGameweeks).toBe(5);
    expect(result.transfers[0].moves[0].scoringGameweeks).toEqual([1, 2, 3]);
    expect(result.analytics.bestTransfer?.netPoints).toBe(5);
    expect(result.analytics.netBudgetChange).toBe(2);
  });

  it('keeps unmatched costs and incomplete price history unavailable and waits for a mature scoring window', () => {
    const result = calculateTransferHistoryAnalytics({
      transfers: [{
        ...baseTransfer,
        gameweekId: 2,
        moves: [{
          ...baseTransfer.moves[0],
          playerOutId: 30,
          playerInId: 40,
        }],
      }],
      members: [{
        fantasySeasonId: 9,
        playerId: 30,
        cost: 10,
        acquiredAt: '2026-09-01T00:00:00Z',
        removedAt: null,
      }],
      gameweeks: weeks,
      scores: [],
      prices: [],
      currentFantasySeasonId: 9,
      currentSeasonId: 3,
    });

    expect(result.transfers[0].budgetImpact).toBeNull();
    expect(result.analytics.netBudgetChange).toBeNull();
    expect(result.transfers[0].moves[0].netPointsNextThreeGameweeks).toBeNull();
    expect(result.analytics.bestTransfer).toBeNull();
    expect(result.analytics.squadValueHistory).toEqual([
      { gameweekNumber: 1, value: null },
      { gameweekNumber: 2, value: null },
      { gameweekNumber: 3, value: null },
    ]);
  });
});
