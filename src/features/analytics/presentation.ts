import type { AnalyticsTrend, ManagerAnalytics } from './api';

export type AnalyticsTrendRange = '3' | '6' | 'all';

export function getAnalyticsTrendForRange(
  trend: AnalyticsTrend[],
  range: AnalyticsTrendRange,
): AnalyticsTrend[] {
  const chronologicalTrend = [...trend].sort((a, b) => a.gameweekId - b.gameweekId);
  return range === 'all' ? chronologicalTrend : chronologicalTrend.slice(-Number(range));
}

function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const safe = typeof value === 'string' && /^[\t\r\n ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function serializeAnalyticsCsv(data: ManagerAnalytics): string {
  const csvRows = [
    ['Section', 'Gameweek', 'Metric', 'Value', 'Player', 'Team', 'Role', 'Points', 'Global Average', 'Global Rank', 'Ownership (%)', 'Price', 'ROI'],
    ['Manager', '', 'Total points', data.user.totalPoints],
    ['Manager', '', 'Global rank', data.user.globalRank],
    ['Manager', '', 'Budget', data.user.budget],
    ['Manager', '', 'Squad value', data.user.squadValue],
    ['Manager', '', 'Free transfers', data.user.freeTransfers],
    ['Captain', '', 'Captain points', data.captainEfficiency.captainPoints],
    ['Captain', '', 'Ideal captain points', data.captainEfficiency.idealCapPoints],
    ['Captain', '', 'Efficiency (%)', data.captainEfficiency.efficiency],
    ...data.trend.map((row) => [
      'Gameweek Trend', `GW ${row.gameweekId}`, '', '', '', '', '',
      row.userScore.toFixed(1), row.globalAverage.toFixed(1), row.rank ?? '', '', '', '',
    ]),
    ...data.roleBreakdown.map((row) => ['Role Breakdown', '', 'Total points', '', '', '', row.role, row.points.toFixed(1)]),
    ...data.market.map((row) => [
      'Market', '', '', '', row.playerName, row.team, row.role, '', '', '', row.ownership, row.price, row.roi,
    ]),
    ...data.dreamTeam.map((row) => [
      'Dream Team', '', '', '', row.playerName, row.team, row.role, row.points, '', '', '', '', '',
    ]),
    ...data.valueForMoney.map((row) => [
      'Value for Money', '', '', '', row.playerName, row.team, row.role, '', '', '', row.ownership, row.price, row.roi,
    ]),
  ];
  return `\uFEFF${csvRows
    .map((row) => Array.from({ length: 13 }, (_, index) => csvCell(row[index])).join(','))
    .join('\r\n')}\r\n`;
}

export function getCaptainEfficiencyAssessment(efficiency: number) {
  if (efficiency >= 80) {
    return { label: 'Good', color: 'text-emerald-300', description: 'Strong captain selection' };
  }
  if (efficiency >= 50) {
    return { label: 'Average', color: 'text-amber-300', description: 'Room to improve your captain pick' };
  }
  return { label: 'Poor', color: 'text-rose-300', description: 'Your captain returned well below the ideal pick' };
}
