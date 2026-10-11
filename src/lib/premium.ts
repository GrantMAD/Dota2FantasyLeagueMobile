export type PremiumFeature = 'advanced-analytics' | 'ai-recommendations' | 'extended-history';

export function isPremiumUser(
  profile: {
    is_premium?: boolean;
    subscription_tier?: string | null;
    isPremium?: boolean;
    subscriptionTier?: string | null;
  } | null | undefined
): boolean {
  if (!profile) return false;
  return (
    profile.is_premium === true ||
    profile.isPremium === true ||
    profile.subscription_tier === 'premium' ||
    profile.subscription_tier === 'pro' ||
    profile.subscriptionTier === 'premium' ||
    profile.subscriptionTier === 'pro'
  );
}

export function canUsePremiumFeature(
  profile: {
    is_premium?: boolean;
    subscription_tier?: string | null;
    isPremium?: boolean;
    subscriptionTier?: string | null;
  } | null | undefined,
  feature: PremiumFeature
): boolean {
  return isPremiumUser(profile) && ['advanced-analytics', 'ai-recommendations', 'extended-history'].includes(feature);
}
