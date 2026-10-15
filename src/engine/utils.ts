import type { VehicleConfig } from './types';

/**
 * Fraction of the purchase price the vehicle retains if sold at the given age.
 * Piecewise-linear through (0, 100%), (5, year5), (10, year10) and (15, year15);
 * beyond 15 years the 10→15 slope continues, floored at zero.
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
