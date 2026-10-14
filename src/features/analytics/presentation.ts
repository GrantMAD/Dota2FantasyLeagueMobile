import type { AnalyticsTrend } from './api';

export type AnalyticsTrendRange = '3' | '6' | 'all';

export function getAnalyticsTrendForRange(
  trend: AnalyticsTrend[],
  range: AnalyticsTrendRange,
): AnalyticsTrend[] {
  const chronologicalTrend = [...trend].sort((a, b) => a.gameweekId - b.gameweekId);
  return range === 'all' ? chronologicalTrend : chronologicalTrend.slice(-Number(range));
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
