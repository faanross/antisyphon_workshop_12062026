/**
 * Core statistical functions used across candidate scoring.
 * Favors robust statistics (MAD, median) over mean-based where noted.
 *
 * Ported verbatim from aionsec_HUNT/src/stats/descriptive.ts.
 */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Coefficient of variation: stddev / mean.
 * Mean-based — use MAD ratio for outlier-robust alternative.
 */
export function cv(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return stddev(values) / m;
}

/**
 * Median Absolute Deviation.
 * Robust measure of dispersion — resistant to outliers.
 */
export function mad(values: number[]): number {
  if (values.length === 0) return 0;
  const med = median(values);
  const deviations = values.map(v => Math.abs(v - med));
  return median(deviations);
}

/**
 * MAD ratio: MAD / median.
 * Robust alternative to CV. Lower = more consistent.
 * Returns 0 if median is 0.
 */
export function madRatio(values: number[]): number {
  const med = median(values);
  if (med === 0) return 0;
  return mad(values) / med;
}

/**
 * Consistency score from MAD ratio: 1 - madRatio, clamped to [0, 1].
 */
export function madConsistency(values: number[]): number {
  return Math.max(0, Math.min(1, 1 - madRatio(values)));
}

export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
