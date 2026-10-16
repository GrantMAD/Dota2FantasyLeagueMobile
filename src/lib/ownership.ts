export type OwnershipTier = 'meta' | 'popular' | 'differential';

export interface OwnershipPresentation {
  tier: OwnershipTier;
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Returns ownership tier and presentation details for a given ownership percentage.
 * Meta Pick: >= 35%
 * Popular Pick: 15% - 34.9%
 * Differential Pick: < 15%
 */
export function getOwnershipPresentation(ownershipPercentage: number | null | undefined): OwnershipPresentation {
  const pct = typeof ownershipPercentage === 'number' && Number.isFinite(ownershipPercentage)
    ? ownershipPercentage
    : 0;

  if (pct >= 35) {
    return {
      tier: 'meta',
      label: 'Meta Pick',
      color: '#10b981',
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-300',
    };
  }

  if (pct >= 15) {
    return {
      tier: 'popular',
      label: 'Popular',
      color: '#06b6d4',
      badgeBg: 'bg-cyan-500/15',
      badgeText: 'text-cyan-300',
    };
  }

  return {
    tier: 'differential',
    label: 'Differential',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
  };
}
