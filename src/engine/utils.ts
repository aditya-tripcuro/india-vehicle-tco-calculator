import type { VehicleConfig } from './types';

/**
 * Fraction of the purchase price the vehicle retains if sold at the given age.
 * Curve fitted through the anchors (0, 100%), (1, year1), (5, year5),
 * (10, year10), (15, year15) with straight segments between them; beyond
 * 15 years the 10→15 slope continues, floored at zero.
 */
export function resalePercentAt(v: VehicleConfig, year: number): number {
  const s = v.resaleSchedule;
  if (year <= 0) return 1;
  if (year >= 15) {
    const slope = (s.year15 - s.year10) / 5;
    return Math.max(0, s.year15 + slope * (year - 15));
  }
  const anchors: Array<[number, number]> = [
    [0, 1],
    [1, s.year1],
    [5, s.year5],
    [10, s.year10],
  ];
  for (let i = 1; i < anchors.length; i++) {
    if (year <= anchors[i][0]) {
      const [x0, p0] = anchors[i - 1];
      const [x1, p1] = anchors[i];
      return p0 + ((year - x0) / (x1 - x0)) * (p1 - p0);
    }
  }
  return s.year15;
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
