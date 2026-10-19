import { formatCountdown, formatRelativeTime } from '@/src/lib/freshness';

describe('freshness formatters', () => {
  const baseTime = new Date('2026-10-19T12:00:00Z');

  describe('formatRelativeTime', () => {
    it('returns "Pending sync" when date string is missing or invalid', () => {
      expect(formatRelativeTime(null, baseTime)).toBe('Pending sync');
      expect(formatRelativeTime(undefined, baseTime)).toBe('Pending sync');
      expect(formatRelativeTime('invalid-date', baseTime)).toBe('Pending sync');
    });

    it('returns "just now" for differences under 45 seconds', () => {
      const recent = new Date(baseTime.getTime() - 20 * 1000).toISOString();
      expect(formatRelativeTime(recent, baseTime)).toBe('just now');
    });

    it('formats minutes ago correctly', () => {
      const fiveMinAgo = new Date(baseTime.getTime() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinAgo, baseTime)).toBe('5m ago');
    });

    it('formats hours ago correctly', () => {
      const twoHoursAgo = new Date(baseTime.getTime() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo, baseTime)).toBe('2h ago');
    });

    it('formats days ago correctly', () => {
      const threeDaysAgo = new Date(baseTime.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeDaysAgo, baseTime)).toBe('3d ago');
    });
  });

  describe('formatCountdown', () => {
    it('returns "soon" when target is missing or invalid', () => {
      expect(formatCountdown(null, baseTime)).toBe('soon');
      expect(formatCountdown(undefined, baseTime)).toBe('soon');
      expect(formatCountdown('invalid-date', baseTime)).toBe('soon');
    });

    it('returns "due now" when target time has passed', () => {
      const past = new Date(baseTime.getTime() - 1000).toISOString();
      expect(formatCountdown(past, baseTime)).toBe('due now');
    });

    it('returns "in <1m" when target is within 60 seconds', () => {
      const soon = new Date(baseTime.getTime() + 30 * 1000).toISOString();
      expect(formatCountdown(soon, baseTime)).toBe('in <1m');
    });

    it('formats minutes countdown correctly', () => {
      const fifteenMin = new Date(baseTime.getTime() + 15 * 60 * 1000).toISOString();
      expect(formatCountdown(fifteenMin, baseTime)).toBe('in ~15m');
    });

    it('formats hours and minutes countdown correctly', () => {
      const oneHourTwenty = new Date(baseTime.getTime() + 80 * 60 * 1000).toISOString();
      expect(formatCountdown(oneHourTwenty, baseTime)).toBe('in ~1h 20m');
    });
  });
});
