import { computeAchievements } from '@/src/features/account/achievementsData';
import { MOBILE_BANNER_THEMES, getMobileBannerTheme } from '@/src/features/account/bannerThemes';

describe('Mobile Profile Enhancements', () => {
  describe('Hero Banner Themes', () => {
    it('has 6 hero-themed presets matching web specifications', () => {
      expect(MOBILE_BANNER_THEMES).toHaveLength(6);
      const ids = MOBILE_BANNER_THEMES.map((t) => t.id);
      expect(ids).toContain('radiant-dawn');
      expect(ids).toContain('dire-crimson');
      expect(ids).toContain('abyssal-depths');
      expect(ids).toContain('aegis-gold');
      expect(ids).toContain('arcane-void');
      expect(ids).toContain('phantom-veil');
    });

    it('returns default radiant-dawn theme when id is missing or unknown', () => {
      const theme = getMobileBannerTheme(null);
      expect(theme.id).toBe('radiant-dawn');

      const unknown = getMobileBannerTheme('non-existent');
      expect(unknown.id).toBe('radiant-dawn');
    });
  });

  describe('Achievements Computation', () => {
    it('evaluates squad and points milestones for an active manager', () => {
      const achievements = computeAchievements({
        hasSquad: true,
        totalPoints: 120,
        globalRank: 500,
        hasBio: true,
        timezone: 'UTC',
        countryCode: 'US',
      });

      const firstSquad = achievements.find((a) => a.id === 'first-squad');
      expect(firstSquad?.unlocked).toBe(true);
      expect(firstSquad?.progressPercent).toBe(100);

      const century = achievements.find((a) => a.id === 'century-club');
      expect(century?.unlocked).toBe(true);

      const top1000 = achievements.find((a) => a.id === 'top-1000');
      expect(top1000?.unlocked).toBe(true);
    });

    it('evaluates milestones for a new manager without squad', () => {
      const achievements = computeAchievements({
        hasSquad: false,
        totalPoints: 0,
        globalRank: null,
        hasBio: false,
      });

      const firstSquad = achievements.find((a) => a.id === 'first-squad');
      expect(firstSquad?.unlocked).toBe(false);
      expect(firstSquad?.progressPercent).toBe(0);
    });
  });
});
