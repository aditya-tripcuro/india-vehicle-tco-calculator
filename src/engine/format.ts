/** Indian number formatting: ₹ with en-IN grouping, plus lakh/crore compaction. */

const inr0 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const inr2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});
const num0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const num2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function formatINR(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '—';
  return decimals > 0 ? inr2.format(n) : inr0.format(n);
}

export function formatNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '—';
  if (decimals === 0) return num0.format(n);
  if (decimals === 1) return num1.format(n);
  return num2.format(n);
}

export function toLakh(n: number): number {
  return n / 1e5;
}

export function formatLakh(n: number, decimals = 2): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}₹${Math.abs(n / 1e5).toFixed(decimals)} L`;
}

/** ₹, lakh or crore depending on magnitude. */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}${inr0.format(abs)}`;
}

export function formatPercent(fraction: number, decimals = 1): string {
  if (!Number.isFinite(fraction)) return '—';
  return `${(fraction * 100).toFixed(decimals)}%`;
}

export function formatSignedPercent(fraction: number, decimals = 1): string {
  if (!Number.isFinite(fraction)) return '—';
  const pct = fraction * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(decimals)}%`;
}

/** Axis label for charts working in ₹ lakh. */
export function lakhAxisLabel(n: number): string {
  return n.toFixed(0);
}
