export interface TransferMemberHistory {
  fantasySeasonId: number;
  playerId: number;
  cost: number;
  acquiredAt: string;
  removedAt: string | null;
}

export interface TransferGameweekHistory {
  id: number;
  seasonId: number;
  gameweekNumber: number;
  status: string;
  endDate: string | null;
}

export interface TransferScoreHistory {
  playerId: number;
  gameweekId: number;
  points: number;
}

export interface TransferPriceHistory {
  playerId: number;
  gameweekId: number;
  price: number;
}

export interface TransferInsight {
  playerOut: string;
  playerIn: string;
  netPoints: number;
  gameweekNumbers: number[];
}

export interface TransferAnalyticsMove {
  playerOutId: number | null;
  playerInId: number | null;
  playerOut: string | null;
  playerIn: string | null;
  budgetImpact: number | null;
  netPointsNextThreeGameweeks: number | null;
  scoredGameweeks: number;
  scoringGameweeks: number[];
}

export interface TransferAnalyticsEntry {
  id: number;
  createdAt: string;
  fantasySeasonId: number | null;
  seasonId: number | null;
  gameweekId: number | null;
  gameweekNumber: number | null;
  penaltyPoints: number | null;
  moves: TransferAnalyticsMove[];
  budgetImpact: number | null;
}

export interface TransferHistoryAnalytics {
  netBudgetChange: number | null;
  pricedTransactions: number;
  totalTransactions: number;
  squadValueHistory: { gameweekNumber: number; value: number | null }[];
  bestTransfer: TransferInsight | null;
  worstTransfer: TransferInsight | null;
}

function parseTimestamp(value: string | null): number | null {
  if (!value) return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

function matchesTransferMoment(eventAt: string, memberAt: string | null): boolean {
  const eventTime = parseTimestamp(eventAt);
  const memberTime = parseTimestamp(memberAt);
  return eventTime !== null && memberTime !== null && Math.abs(eventTime - memberTime) <= 60_000;
}

function findMemberCost(
  members: TransferMemberHistory[],
  seasonId: number | null,
  playerId: number | null,
  eventAt: string,
  direction: 'acquired' | 'removed',
): number | null {
  if (seasonId === null || playerId === null) return null;
  const member = members.find((row) =>
    row.fantasySeasonId === seasonId &&
    row.playerId === playerId &&
    matchesTransferMoment(eventAt, direction === 'acquired' ? row.acquiredAt : row.removedAt)
  );
  return member && Number.isFinite(member.cost) ? member.cost : null;
}

function closedScoringWeeks(
  seasonId: number | null,
  gameweekId: number | null,
  gameweeks: TransferGameweekHistory[],
): TransferGameweekHistory[] {
  if (seasonId === null || gameweekId === null) return [];
  const weeks = gameweeks
    .filter((week) => week.seasonId === seasonId)
    .sort((a, b) => a.gameweekNumber - b.gameweekNumber);
  const startIndex = weeks.findIndex((week) => week.id === gameweekId);
  if (startIndex < 0) return [];
  const window = weeks.slice(startIndex, startIndex + 3);
  return window.length === 3 && window.every((week) => ['closed', 'locked'].includes(week.status))
    ? window
    : [];
}

function buildSquadValueHistory(
  fantasySeasonId: number | null,
  seasonId: number | null,
  members: TransferMemberHistory[],
  gameweeks: TransferGameweekHistory[],
  prices: TransferPriceHistory[],
): TransferHistoryAnalytics['squadValueHistory'] {
  if (fantasySeasonId === null || seasonId === null) return [];
  const seasonMembers = members.filter((member) => member.fantasySeasonId === fantasySeasonId);
  const priceByPlayerWeek = new Map(prices.map((price) => [`${price.playerId}:${price.gameweekId}`, price.price]));

  const history: TransferHistoryAnalytics['squadValueHistory'] = [];
  for (const week of gameweeks
    .filter((week) => week.seasonId === seasonId && ['closed', 'locked'].includes(week.status))
    .sort((a, b) => a.gameweekNumber - b.gameweekNumber)) {
    const endTime = parseTimestamp(week.endDate);
    if (endTime === null) continue;
    const ownedAtEnd = seasonMembers.filter((member) => {
      const acquiredTime = parseTimestamp(member.acquiredAt);
      const removedTime = parseTimestamp(member.removedAt);
      return acquiredTime !== null &&
        acquiredTime <= endTime &&
        (removedTime === null || removedTime > endTime);
    });
    let total = 0;
    let complete = true;
    for (const member of ownedAtEnd) {
      const price = priceByPlayerWeek.get(`${member.playerId}:${week.id}`);
      if (price === undefined || !Number.isFinite(price)) {
        complete = false;
        break;
      }
      total += price;
    }
    history.push({
      gameweekNumber: week.gameweekNumber,
      value: complete ? Math.round(total * 100) / 100 : null,
    });
  }
  return history;
}

export function calculateTransferHistoryAnalytics(input: {
  transfers: TransferAnalyticsEntry[];
  members: TransferMemberHistory[];
  gameweeks: TransferGameweekHistory[];
  scores: TransferScoreHistory[];
  prices: TransferPriceHistory[];
  currentFantasySeasonId: number | null;
  currentSeasonId: number | null;
}): { transfers: TransferAnalyticsEntry[]; analytics: TransferHistoryAnalytics } {
  const scoreByPlayerWeek = new Map<string, number>();
  for (const score of input.scores) {
    const key = `${score.playerId}:${score.gameweekId}`;
    scoreByPlayerWeek.set(key, (scoreByPlayerWeek.get(key) ?? 0) + score.points);
  }

  const transfers = input.transfers.map((transfer) => {
    const moves = transfer.moves.map((move) => {
      const outCost = findMemberCost(input.members, transfer.fantasySeasonId, move.playerOutId, transfer.createdAt, 'removed');
      const inCost = findMemberCost(input.members, transfer.fantasySeasonId, move.playerInId, transfer.createdAt, 'acquired');
      const weeks = closedScoringWeeks(transfer.seasonId, transfer.gameweekId, input.gameweeks);
      const netPoints = weeks.length === 3 && move.playerOutId !== null && move.playerInId !== null
        ? weeks.reduce((sum, week) =>
            sum +
            (scoreByPlayerWeek.get(`${move.playerInId}:${week.id}`) ?? 0) -
            (scoreByPlayerWeek.get(`${move.playerOutId}:${week.id}`) ?? 0), 0)
        : null;
      return {
        ...move,
        budgetImpact: outCost !== null && inCost !== null ? Math.round((outCost - inCost) * 100) / 100 : null,
        netPointsNextThreeGameweeks: netPoints === null ? null : Math.round(netPoints * 100) / 100,
        scoredGameweeks: weeks.length,
        scoringGameweeks: weeks.map((week) => week.gameweekNumber),
      };
    });
    const budgetImpact = moves.length > 0 && moves.every((move) => move.budgetImpact !== null)
      ? Math.round(moves.reduce((sum, move) => sum + (move.budgetImpact ?? 0), 0) * 100) / 100
      : null;
    return { ...transfer, moves, budgetImpact };
  });

  const insights = transfers.flatMap((transfer) => transfer.moves.flatMap((move) =>
    move.playerOut !== null && move.playerIn !== null && move.netPointsNextThreeGameweeks !== null
      ? [{
          playerOut: move.playerOut,
          playerIn: move.playerIn,
          netPoints: move.netPointsNextThreeGameweeks,
          gameweekNumbers: move.scoringGameweeks,
        }]
      : []
  ));
  const pricedTransactions = transfers.filter((transfer) => transfer.budgetImpact !== null).length;
  const totalBudgetChange = transfers.reduce((sum, transfer) => sum + (transfer.budgetImpact ?? 0), 0);

  return {
    transfers,
    analytics: {
      netBudgetChange: pricedTransactions > 0 ? Math.round(totalBudgetChange * 100) / 100 : null,
      pricedTransactions,
      totalTransactions: transfers.length,
      squadValueHistory: buildSquadValueHistory(
        input.currentFantasySeasonId,
        input.currentSeasonId,
        input.members,
        input.gameweeks,
        input.prices,
      ),
      bestTransfer: insights.reduce<TransferInsight | null>(
        (best, insight) => best === null || insight.netPoints > best.netPoints ? insight : best,
        null,
      ),
      worstTransfer: insights.reduce<TransferInsight | null>(
        (worst, insight) => worst === null || insight.netPoints < worst.netPoints ? insight : worst,
        null,
      ),
    },
  };
}
