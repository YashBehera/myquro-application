/**
 * Formats large review or rating counts cleanly (e.g., 94000 -> "94K+", 2400 -> "2.4K+", 49 -> "49").
 */
export function formatRatingCount(count: unknown, fallback = ''): string {
  const num = Number(count);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
  }
  return `${Math.round(num)}`;
}
