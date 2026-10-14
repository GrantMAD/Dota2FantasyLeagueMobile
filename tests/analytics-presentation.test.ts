import { getAnalyticsTrendForRange, getCaptainEfficiencyAssessment } from '../src/features/analytics/presentation';

describe('mobile analytics presentation helpers', () => {
  const trend = [8, 2, 6, 4, 1, 5, 3].map((gameweekId) => ({
    gameweekId,
    userScore: gameweekId * 10,
    globalAverage: gameweekId * 8,
  }));

  it('returns the latest selected trend range in gameweek order without mutating the source', () => {
    expect(getAnalyticsTrendForRange(trend, '3').map((row) => row.gameweekId)).toEqual([5, 6, 8]);
    expect(getAnalyticsTrendForRange(trend, '6').map((row) => row.gameweekId)).toEqual([2, 3, 4, 5, 6, 8]);
    expect(getAnalyticsTrendForRange(trend, 'all').map((row) => row.gameweekId)).toEqual([1, 2, 3, 4, 5, 6, 8]);
    expect(trend[0].gameweekId).toBe(8);
  });

  it('uses consistent captain-efficiency benchmarks at the threshold boundaries', () => {
    expect(getCaptainEfficiencyAssessment(80).label).toBe('Good');
    expect(getCaptainEfficiencyAssessment(79.9).label).toBe('Average');
    expect(getCaptainEfficiencyAssessment(50).label).toBe('Average');
    expect(getCaptainEfficiencyAssessment(49.9).label).toBe('Poor');
  });
});
