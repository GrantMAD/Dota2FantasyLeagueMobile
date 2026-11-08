/**
 * Standardized player price formatting across the mobile fantasy application.
 * Prices can fluctuate by cents (e.g. $5.03M).
 * Formatting with 2 decimal places ensures small price movements are never rounded away or hidden.
 */
export function formatPlayerPrice(price: number | null | undefined): string {
  if (price == null || Number.isNaN(Number(price))) {
    return '$0.00M';
  }
  return `$${Number(price).toFixed(2)}M`;
}

/**
 * Formats price without currency symbol, but with 'M' suffix (e.g. '5.03M').
 */
export function formatPlayerPriceCompact(price: number | null | undefined): string {
  if (price == null || Number.isNaN(Number(price))) {
    return '0.00M';
  }
  return `${Number(price).toFixed(2)}M`;
}

