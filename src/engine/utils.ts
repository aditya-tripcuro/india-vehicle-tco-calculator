import type { VehicleConfig } from './types';

/**
 * Tangents for monotone cubic Hermite interpolation (PCHIP, Fritsch–Carlson).
 * The curve passes exactly through every anchor with continuous first
 * derivatives and never overshoots the anchor values between them.
 */
function pchipTangents(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const h: number[] = [];
  const d: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    h[k] = xs[k + 1] - xs[k];
    d[k] = (ys[k + 1] - ys[k]) / h[k];
  }
  const m: number[] = new Array(n).fill(0);
  // Interior points: weighted harmonic mean of the adjacent secant slopes;
  // zero wherever the data changes direction.
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) {
      m[k] = 0;
    } else {
      const w1 = 2 * h[k] + h[k - 1];
      const w2 = h[k] + 2 * h[k - 1];
      m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
    }
  }
  // Endpoints: one-sided three-point estimate, clamped to stay monotone.
  m[0] = ((2 * h[0] + h[1]) * d[0] - h[0] * d[1]) / (h[0] + h[1]);
  if (m[0] * d[0] <= 0) m[0] = 0;
  else if (d[0] * d[1] <= 0 && Math.abs(m[0]) > Math.abs(3 * d[0])) m[0] = 3 * d[0];
  m[n - 1] = ((2 * h[n - 2] + h[n - 3]) * d[n - 2] - h[n - 2] * d[n - 3]) / (h[n - 2] + h[n - 3]);
  if (m[n - 1] * d[n - 2] <= 0) m[n - 1] = 0;
  else if (d[n - 2] * d[n - 3] <= 0 && Math.abs(m[n - 1]) > Math.abs(3 * d[n - 2]))
    m[n - 1] = 3 * d[n - 2];
  return m;
}

function pchipEval(xs: number[], ys: number[], m: number[], x: number): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let k = 0;
  while (k < n - 2 && x > xs[k + 1]) k++;
  const h = xs[k + 1] - xs[k];
  const t = (x - xs[k]) / h;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
  const h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2;
  const h11 = t ** 3 - t ** 2;
  return h00 * ys[k] + h10 * h * m[k] + h01 * ys[k + 1] + h11 * h * m[k + 1];
}

/**
 * Fraction of the purchase price the vehicle retains if sold at the given age.
 * A smooth monotone cubic curve (PCHIP) fitted through the anchors
 * (0, 100%), (1, year1), (5, year5), (10, year10), (15, year15) — it passes
 * exactly through each anchor without straight-line segments. Beyond 15 years
 * the curve continues on its end tangent, floored at zero.
 */
export function resalePercentAt(v: VehicleConfig, year: number): number {
  const s = v.resaleSchedule;
  if (year <= 0) return 1;
  const xs = [0, 1, 5, 10, 15];
  const ys = [1, s.year1, s.year5, s.year10, s.year15];
  const m = pchipTangents(xs, ys);
  if (year >= 15) {
    return Math.max(0, s.year15 + m[m.length - 1] * (year - 15));
  }
  return Math.min(1, Math.max(0, pchipEval(xs, ys, m, year)));
}

export function resaleValue(v: VehicleConfig, ownershipYears: number): number {
  return v.purchasePrice * resalePercentAt(v, ownershipYears);
}

/**
 * Interest portion of each ownership year for a reducing-balance vehicle loan
 * (EMI = equated monthly instalment). Interest is a real cash cost; the
 * principal repayment is not — the purchase price already carries it once.
 */
export function loanInterestByYear(
  purchasePrice: number,
  loan: { enabled: boolean; downPaymentPercent: number; annualInterestRate: number; tenureYears: number },
  ownershipYears: number,
): { interestByYear: number[]; principal: number; downPayment: number } {
  const downPayment = purchasePrice * Math.min(1, Math.max(0, loan.downPaymentPercent));
  const principal = purchasePrice - downPayment;
  const interestByYear = new Array<number>(Math.max(1, ownershipYears)).fill(0);
  if (!loan.enabled || principal <= 0 || loan.annualInterestRate <= 0 || loan.tenureYears <= 0) {
    return { interestByYear, principal: loan.enabled ? principal : 0, downPayment: loan.enabled ? downPayment : purchasePrice };
  }
  const months = Math.round(loan.tenureYears * 12);
  const i = loan.annualInterestRate / 12;
  const emi =
    (principal * i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
  let balance = principal;
  for (let k = 1; k <= months && k <= ownershipYears * 12; k++) {
    const interest = balance * i;
    balance = Math.max(0, balance - (emi - interest));
    interestByYear[Math.ceil(k / 12) - 1] += interest;
  }
  return { interestByYear, principal, downPayment };
}
