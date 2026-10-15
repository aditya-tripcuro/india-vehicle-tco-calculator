import type { GlobalSettings, VehicleConfig } from './types';

/** Returns a list of human-readable validation issues. Empty list = valid. */
export function validateVehicle(v: VehicleConfig, ownershipYears: number): string[] {
  const issues: string[] = [];
  if (!(v.purchasePrice >= 0)) issues.push('Purchase price cannot be negative.');
  if (!(v.highwayRangeKm >= 0)) issues.push('Highway range cannot be negative.');
  if (!(v.cityRangeKm >= 0)) issues.push('City range cannot be negative.');

  if (v.powertrain === 'petrol') {
    if (!(v.highwayMileage > 0)) issues.push('Highway mileage must be greater than 0 km/l.');
    if (!(v.cityMileage > 0)) issues.push('City mileage must be greater than 0 km/l.');
    if (!(v.fuelPrice >= 0)) issues.push('Petrol price cannot be negative.');
    if (v.fuelPriceEscalation <= -1) issues.push('Petrol price increase must be greater than −100%.');
    if (!(v.annualMileageDegradation >= 0 && v.annualMileageDegradation < 1))
      issues.push('Mileage degradation must be between 0% and 100%.');
  }

  if (v.powertrain === 'electric') {
    if (!(v.batteryCapacityKwh > 0)) issues.push('Battery capacity must be greater than 0 kWh.');
    if (!(v.highwayEfficiency > 0)) issues.push('Highway efficiency must be greater than 0 km/kWh.');
    if (!(v.cityEfficiency > 0)) issues.push('City efficiency must be greater than 0 km/kWh.');
    if (!(v.electricityPrice >= 0)) issues.push('Electricity price cannot be negative.');
    if (v.electricityEscalation <= -1) issues.push('Electricity price increase must be greater than −100%.');
    if (!(v.chargingEfficiency > 0 && v.chargingEfficiency <= 1))
      issues.push('Charging efficiency must be between 0% (exclusive) and 100%.');
    if (!(v.batteryCycleLife >= 1)) issues.push('Cycle life must be at least 1 equivalent full cycle.');
    if (!(v.batteryReplacementCost >= 0)) issues.push('Battery replacement cost cannot be negative.');
    if (!(v.capacityAtCycleLife > 0 && v.capacityAtCycleLife <= 1))
      issues.push('Capacity at cycle-life limit must be between 0% (exclusive) and 100%.');
    if (v.annualEfficiencyDegradation < 0 || v.annualEfficiencyDegradation >= 1)
      issues.push('Efficiency degradation must be between 0% and 100%.');
    if (
      v.manualReplacementYear != null &&
      (!(v.manualReplacementYear >= 1) || !(v.manualReplacementYear <= ownershipYears))
    )
      issues.push(`Manual replacement year must be between 1 and ${ownershipYears}.`);
  }

  if (!(v.year1Maintenance >= 0)) issues.push('Maintenance cost cannot be negative.');
  if (v.maintenanceEscalation <= -1) issues.push('Maintenance escalation must be greater than −100%.');
  if (!(v.year1Insurance >= 0)) issues.push('Insurance premium cannot be negative.');
  if (v.insuranceAnnualChange <= -1) issues.push('Insurance change must be greater than −100%.');
  if (!(v.year1TyreCost >= 0)) issues.push('Tyre cost cannot be negative.');
  if (v.tyreEscalation <= -1) issues.push('Tyre escalation must be greater than −100%.');
  for (const [label, val] of [
    ['1-year', v.resaleSchedule.year1],
    ['5-year', v.resaleSchedule.year5],
    ['10-year', v.resaleSchedule.year10],
    ['15-year', v.resaleSchedule.year15],
  ] as const) {
    if (!(val >= 0 && val <= 1))
      issues.push(`Resale value at ${label} age must be between 0% and 100% of purchase price.`);
  }
  for (const e of v.otherExpenses) {
    if (!(e.amount >= 0)) issues.push(`One-time expense “${e.label || e.year}” cannot be negative.`);
    if (!(e.year >= 1)) issues.push('One-time expense year must be 1 or later.');
  }
  return issues;
}

export function validateSettings(s: GlobalSettings): string[] {
  const issues: string[] = [];
  if (!(s.ownershipYears >= 1 && s.ownershipYears <= 50))
    issues.push('Ownership period must be between 1 and 50 years.');
  if (s.opportunityCostRate < -1) issues.push('Opportunity cost rate must be greater than −100%.');
  if (!(s.monthlyHighwayKm >= 0)) issues.push('Monthly highway distance cannot be negative.');
  if (!(s.monthlyCityKm >= 0)) issues.push('Monthly city distance cannot be negative.');
  if (s.annualDistanceGrowth < -1) issues.push('Distance growth must be greater than −100%.');
  if (s.loan) {
    if (!(s.loan.downPaymentPercent >= 0 && s.loan.downPaymentPercent <= 1))
      issues.push('Loan down payment must be between 0% and 100% of the purchase price.');
    if (!(s.loan.annualInterestRate >= 0))
      issues.push('Loan interest rate cannot be negative.');
    if (!(s.loan.tenureYears >= 1 && s.loan.tenureYears <= 30))
      issues.push('Loan tenure must be between 1 and 30 years.');
  }
  return issues;
}
