import { computeAchievements, getSeasonRankTier } from '@/src/features/account/achievementsData';
import { MOBILE_BANNER_THEMES, getMobileBannerTheme } from '@/src/features/account/bannerThemes';
import {
  getDefaultTimezoneForCountry,
  MOBILE_COUNTRY_OPTIONS,
  MOBILE_TIMEZONE_OPTIONS,
} from '@/src/features/account/settingOptions';

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

    it('includes the web descriptions and role details for every theme', () => {
      expect(MOBILE_BANNER_THEMES.every((theme) => theme.description.length > 0 && theme.dotaRole.length > 0)).toBe(true);
    });
  });

  describe('Profile settings options', () => {
    it('provides searchable country choices and the web timezone set', () => {
      expect(MOBILE_COUNTRY_OPTIONS.find((option) => option.value === 'US')?.label).toBe('United States');
      expect(MOBILE_COUNTRY_OPTIONS.find((option) => option.value === 'GB')?.label).toBe('United Kingdom');
      expect(MOBILE_TIMEZONE_OPTIONS.map((option) => option.value)).toEqual([
        'UTC',
        'Africa/Johannesburg',
        'America/Toronto',
        'America/New_York',
        'America/Chicago',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Berlin',
        'Asia/Manila',
        'Asia/Singapore',
      ]);
    });

    it('suggests the primary timezone for countries with a defined default', () => {
      expect(getDefaultTimezoneForCountry('ZA')).toBe('Africa/Johannesburg');
      expect(getDefaultTimezoneForCountry('za')).toBe('Africa/Johannesburg');
      expect(getDefaultTimezoneForCountry('GB')).toBe('Europe/London');
      expect(getDefaultTimezoneForCountry('unknown')).toBeNull();
    });
  });

  describe('Season rank tiers', () => {
    it.each([
      [null, 'Unranked'],
      [0, 'Unranked'],
      [10, 'Top 10'],
      [100, 'Top 100'],
      [1000, 'Top 1,000'],
      [1001, 'Ranked Manager'],
    ])('labels global rank %s as %s', (rank, expectedTier) => {
      expect(getSeasonRankTier(rank)).toBe(expectedTier);
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

      expect(achievements.find((achievement) => achievement.id === 'perfect-gw')?.tier).toBe('platinum');
      expect(achievements.find((achievement) => achievement.id === 'first-squad')?.unlockedAtLabel).toBe('Active Season');
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
