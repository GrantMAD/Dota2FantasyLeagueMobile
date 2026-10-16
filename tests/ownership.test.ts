import { getOwnershipPresentation } from '@/src/lib/ownership';

describe('getOwnershipPresentation', () => {
  it('classifies players with ownership >= 35% as Meta Pick', () => {
    const res = getOwnershipPresentation(35);
    expect(res.tier).toBe('meta');
    expect(res.label).toBe('Meta Pick');
    expect(res.badgeText).toContain('emerald');
    expect(res.color).toBe('#10b981');

    const high = getOwnershipPresentation(82.4);
    expect(high.tier).toBe('meta');
  });

  it('classifies players with ownership between 15% and 34.9% as Popular', () => {
    const res = getOwnershipPresentation(15);
    expect(res.tier).toBe('popular');
    expect(res.label).toBe('Popular');
    expect(res.badgeText).toContain('cyan');
    expect(res.color).toBe('#06b6d4');

    const mid = getOwnershipPresentation(34.9);
    expect(mid.tier).toBe('popular');
  });

  it('classifies players with ownership < 15% as Differential', () => {
    const res = getOwnershipPresentation(14.9);
    expect(res.tier).toBe('differential');
    expect(res.label).toBe('Differential');
    expect(res.badgeText).toContain('amber');
    expect(res.color).toBe('#f59e0b');

    const zero = getOwnershipPresentation(0);
    expect(zero.tier).toBe('differential');

    const nullVal = getOwnershipPresentation(null);
    expect(nullVal.tier).toBe('differential');
  });
});
