import {
  createSeasonRecapShareCardSvg,
  formatSeasonRecapDate,
  SEASON_RECAP_CARD_THEMES,
} from '../src/features/season-recap/share-card';
import type { SeasonRecap } from '../src/features/season-recap/api';

const recap: SeasonRecap = {
  seasonId: 1,
  fantasySeasonId: 2,
  seasonName: '2025 <Final> & Beyond',
  startDate: '2025-08-01',
  endDate: '2026-06-01',
  totalPoints: 1234.5,
  finalGlobalRank: 8,
  bestGameweek: { gameweek: 4, points: 321.5 },
  rankProgression: { startingRank: 100, finalRank: 8 },
  topPlayer: { name: 'Player <One>', points: 240.5 },
  transferCount: 12,
  bestLeagueRank: 3,
};

describe('season recap share card', () => {
  it('provides the same three named theme palettes as the web recap', () => {
    expect(SEASON_RECAP_CARD_THEMES.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'radiant', name: 'Radiant' },
      { id: 'dire', name: 'Dire' },
      { id: 'aegis', name: 'Aegis' },
    ]);
    expect(SEASON_RECAP_CARD_THEMES.map(({ startColor, endColor }) => [startColor, endColor])).toEqual([
      ['#0f172a', '#164e63'],
      ['#1c1018', '#7f1d1d'],
      ['#111827', '#713f12'],
    ]);
  });

  it('renders all recap details and safely escapes user-provided SVG text', () => {
    const svg = createSeasonRecapShareCardSvg(recap);
    expect(svg).toContain('2025 &lt;Final&gt; &amp; Beyond');
    expect(svg).toContain('Player &lt;One&gt;');
    expect(svg).toContain('1234.5');
    expect(svg).toContain('GW 4 · 321.5 pts');
    expect(svg).toContain('#100 → #8');
    expect(svg).toContain('Shared voluntarily · No manager name or account details included');
    expect(svg).not.toContain('Player <One>');
  });

  it('changes the generated preview and export palette for every selected theme', () => {
    const svgs = SEASON_RECAP_CARD_THEMES.map((theme) =>
      createSeasonRecapShareCardSvg(recap, theme.id));

    expect(svgs.map((svg) => svg.match(/<stop offset="0" stop-color="([^"]+)"/)?.[1])).toEqual([
      '#0f172a',
      '#1c1018',
      '#111827',
    ]);
    expect(svgs.map((svg) => svg.match(/stroke="([^"]+)" stroke-opacity/)?.[1])).toEqual([
      '#22d3ee',
      '#fb7185',
      '#fbbf24',
    ]);
  });

  it('formats valid season dates and omits invalid ones', () => {
    expect(formatSeasonRecapDate(null)).toBe('');
    expect(formatSeasonRecapDate('not-a-date')).toBe('');
    expect(formatSeasonRecapDate('2025-08-01')).toMatch(/2025/);
  });
});
