import { isPremiumUser } from '../src/lib/premium';

describe('isPremiumUser', () => {
  it.each([
    [{ is_premium: true, subscription_tier: 'free' }, true],
    [{ is_premium: false, subscription_tier: 'premium' }, true],
    [{ is_premium: false, subscription_tier: 'pro' }, true],
    [{ is_premium: false, subscription_tier: 'free' }, false],
    [null, false],
  ])('returns expected subscription status', (profile, expected) => {
    expect(isPremiumUser(profile)).toBe(expected);
  });
});
