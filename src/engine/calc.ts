import type {
  BatteryReplacementRecord,
  ComparisonResult,
  GlobalSettings,
  InstalledBatterySummary,
  VehicleConfig,
  VehicleResult,
  VehicleTotals,
  VehicleYearResult,
} from './types';
import { resaleValue, loanInterestByYear } from './utils';

/**
 * Pure calculation engine. No React, no DOM. Rounding happens only at display
 * time — all intermediate values stay unrounded.
 */

/** Annualized tyre provision for every year, or the detailed replacement-interval model. */
function tyreCostsByYear(v: VehicleConfig, years: number, annualKm: (n: number) => number): number[] {
  const out = new Array<number>(years).fill(0);
  if (!v.useDetailedTyreModel) {
    for (let n = 1; n <= years; n++) {
      out[n - 1] = v.year1TyreCost * Math.pow(1 + v.tyreEscalation, n - 1);
    }
    return out;
  }
  // Detailed model: replace when cumulative km since the last set reaches the interval.
  // Only one method is ever active — the toggle guarantees mutual exclusivity.
  const { pricePerTyre, numberOfTyres, replacementIntervalKm } = v.tyreDetail;
  const cost = pricePerTyre * numberOfTyres;
  if (!(replacementIntervalKm > 0) || !(cost > 0)) return out;
  let kmSinceReplace = 0;
  for (let n = 1; n <= years; n++) {
    kmSinceReplace += annualKm(n);
    if (kmSinceReplace >= replacementIntervalKm) {
      out[n - 1] = cost;
      kmSinceReplace = 0;
    }
  }
  return out;
}

export function calculateVehicle(
  v: VehicleConfig,
  settings: GlobalSettings,
  baseline: VehicleConfig,
): VehicleResult {
  const N = Math.max(1, Math.round(settings.ownershipYears));
  const isEv = v.powertrain === 'electric';
  const isBaseline = v.id === baseline.id;
  const loan = settings.loan;
  const loanOn = !!loan?.enabled;

  // Personal money put in upfront: the full price when paying cash, only the
  // down payment when the vehicle is financed. The opportunity cost of owning
  // the pricier vehicle applies to the difference in personal money alone —
  // the financed portion is the bank's money, not the owner's.
  const downPayment = loanOn ? v.purchasePrice * Math.min(1, Math.max(0, loan.downPaymentPercent)) : v.purchasePrice;
  const downPaymentBaseline = loanOn
    ? baseline.purchasePrice * Math.min(1, Math.max(0, loan.downPaymentPercent))
    : baseline.purchasePrice;
  const extraUpfront = isBaseline ? 0 : downPayment - downPaymentBaseline;
  const rate = settings.opportunityCostRate;
  const resale = resaleValue(v, N);
  const growth = settings.distanceGrowthEnabled ? 1 + settings.annualDistanceGrowth : 1;

  const years: VehicleYearResult[] = [];
  const replacements: BatteryReplacementRecord[] = [];
  const batteries: InstalledBatterySummary[] = [];

  // Driving profile is shared by every vehicle (global setting).
  const monthlyHighwayKm = settings.monthlyHighwayKm;
  const monthlyCityKm = settings.monthlyCityKm;

  // Battery state (EV only). installedYear = year the battery was fitted (original:
  // year 1; replacement: the year whose end it was fitted in). serviceStart = the
  // first year it actually serves, so every battery shows 100% capacity in its
  // first service year, exactly like the original.
  let batteryIndex = 0;
  let batteryInstalledYear = 1;
  let batteryServiceStart = 1;
  let cumulativeEfc = 0;
  let efcOnOriginalBattery = 0;
  let annualEfcTypical = 0;

  const annualKmFn = (n: number) => (monthlyHighwayKm + monthlyCityKm) * 12 * Math.pow(growth, n - 1);
  const tyresByYear = tyreCostsByYear(v, N, annualKmFn);
  const { interestByYear: loanInterestByYearArr, principal: loanPrincipal } = loanInterestByYear(
    v.purchasePrice,
    loan ?? { enabled: false, downPaymentPercent: 0, annualInterestRate: 0, tenureYears: 0 },
    N,
  );

  let cumulativeCash = 0;
  const totals: VehicleTotals = {
    energyCost: 0,
    maintenanceExBattery: 0,
    batteryReplacementTotal: 0,
    insurance: 0,
    tyres: 0,
    other: 0,
    loanInterestTotal: 0,
    operatingTotal: 0,
    purchasePrice: v.purchasePrice,
    resale: 0,
    cashTco: 0,
    extraUpfront,
    downPayment,
    loanPrincipal,
    foregoneEarningsAtEnd: 0,
    economicTco: 0,
    unitsTotal: 0,
    batteryKwhTotal: 0,
    batteries,
    totalEfcOriginalBattery: 0,
    finalRemainingCapacityKwh: 0,
    finalRemainingCapacityPercent: 0,
    replacements,
    projectedReplacementYear: null,
  };

  for (let n = 1; n <= N; n++) {
    const gf = Math.pow(growth, n - 1);
    const highwayKm = monthlyHighwayKm * 12 * gf;
    const cityKm = monthlyCityKm * 12 * gf;
    const totalKm = highwayKm + cityKm;

    let highwayLitres = 0;
    let cityLitres = 0;
    let totalLitres = 0;
    let highwayKwh = 0;
    let cityKwh = 0;
    let batteryKwh = 0;
    let gridKwh = 0;
    let annualEfc = 0;
    let energyPrice: number;
    let energyCost: number;

    if (v.powertrain === 'petrol') {
      // Highway and city consumption are always computed independently.
      const hwMileage = v.highwayMileage * Math.pow(1 - v.annualMileageDegradation, n - 1);
      const cityMileage = v.cityMileage * Math.pow(1 - v.annualMileageDegradation, n - 1);
      highwayLitres = hwMileage > 0 ? highwayKm / hwMileage : 0;
      cityLitres = cityMileage > 0 ? cityKm / cityMileage : 0;
      totalLitres = highwayLitres + cityLitres;
      energyPrice = v.fuelPrice * Math.pow(1 + v.fuelPriceEscalation, n - 1);
      energyCost = totalLitres * energyPrice;
    } else {
      const effDegradation = v.efficiencyDegradationEnabled
        ? Math.pow(1 - v.annualEfficiencyDegradation, n - 1)
        : 1;
      const hwEff = v.highwayEfficiency * effDegradation;
      const cityEff = v.cityEfficiency * effDegradation;
      highwayKwh = hwEff > 0 ? highwayKm / hwEff : 0;
      cityKwh = cityEff > 0 ? cityKm / cityEff : 0;
      batteryKwh = highwayKwh + cityKwh; // battery discharge — charging losses NOT included
      const chargeEff = v.chargingEfficiency > 0 ? v.chargingEfficiency : 1;
      gridKwh = batteryKwh / chargeEff; // charging losses raise grid draw only
      energyPrice = v.electricityPrice * Math.pow(1 + v.electricityEscalation, n - 1);
      energyCost = gridKwh * energyPrice;
      // EFC denominator is always the battery's rated capacity, never the degraded one.
      annualEfc = v.batteryCapacityKwh > 0 ? batteryKwh / v.batteryCapacityKwh : 0;
      cumulativeEfc += annualEfc;
      annualEfcTypical = annualEfc;
      if (batteryIndex === 0) efcOnOriginalBattery = cumulativeEfc;
    }

    const maintenance = v.year1Maintenance * Math.pow(1 + v.maintenanceEscalation, n - 1);
    const insurance = v.year1Insurance * Math.pow(1 + v.insuranceAnnualChange, n - 1);
    const tyres = tyresByYear[n - 1];
    const other = v.otherExpenses
      .filter((e) => Math.round(e.year) === n)
      .reduce((sum, e) => sum + e.amount, 0);

    // Battery condition as served during this year (replacement, if any, happens at
    // the end of the year, so this year still shows the outgoing battery).
    let batteryState: VehicleYearResult['battery'] = null;
    let replacementThisYear = false;
    let batteryReplacementCost = 0;

    if (isEv) {
      const batteryAge = Math.max(0, n - batteryServiceStart);
      // Cycle-based capacity fade: capacity falls with charge throughput
      // (equivalent full cycles on the installed battery), reaching
      // capacityAtCycleLife exactly at the cycle-life limit — e.g. 80% at
      // 1,200 cycles. Calendar time alone causes no fade; replacing the
      // battery resets both the cycle counter and the capacity clock.
      const cycleFadeFactor =
        v.batteryCycleLife > 0 && v.capacityAtCycleLife > 0 && v.capacityAtCycleLife <= 1
          ? Math.pow(v.capacityAtCycleLife, 1 / v.batteryCycleLife)
          : 1;
      const capacityFraction = Math.pow(cycleFadeFactor, cumulativeEfc);
      const remainingCapacityKwh = v.batteryCapacityKwh * capacityFraction;
      const manualTrigger =
        v.manualReplacementYear != null && Math.round(v.manualReplacementYear) === n;
      const cycleTrigger =
        v.batteryCycleLife > 0 && cumulativeEfc >= v.batteryCycleLife;
      replacementThisYear = isEv && (cycleTrigger || manualTrigger);
      batteryReplacementCost = replacementThisYear ? v.batteryReplacementCost : 0;

      batteryState = {
        batteryIndex,
        installedYear: batteryInstalledYear,
        batteryAge,
        ratedCapacityKwh: v.batteryCapacityKwh,
        remainingCapacityKwh,
        remainingCapacityPercent: capacityFraction,
        annualEfc,
        cumulativeEfc,
        remainingCycles: Math.max(0, v.batteryCycleLife - cumulativeEfc),
        replacementThisYear,
        highwayRangeKm: v.highwayRangeKm * capacityFraction,
        cityRangeKm: v.cityRangeKm * capacityFraction,
      };

      if (replacementThisYear) {
        replacements.push({
          batteryIndex,
          installedYear: batteryInstalledYear,
          replacedInYear: n,
          cost: batteryReplacementCost,
          efcAtReplacement: cumulativeEfc,
        });
        batteries.push({
          batteryIndex,
          installedYear: batteryInstalledYear,
          accumulatedEfc: cumulativeEfc,
          replacedInYear: n,
        });
        // Reset for the replacement battery: new counter, new capacity clock,
        // EFC accumulation for the new battery starts next year.
        batteryIndex += 1;
        batteryInstalledYear = n;
        batteryServiceStart = n + 1;
        cumulativeEfc = 0;
      }
    }

    const loanInterest = loanInterestByYearArr[n - 1] ?? 0;
    const operatingCost =
      energyCost + maintenance + batteryReplacementCost + insurance + tyres + other + loanInterest;
    const purchaseApplied = n === 1 ? v.purchasePrice : 0;
    const resaleReceived = n === N ? resale : 0;
    cumulativeCash += purchaseApplied + operatingCost - resaleReceived;

    // Opportunity cost vs the baseline. Cumulative foregone earnings through year n
    // = extra × ((1+r)^n − 1); the annual adjustment is the year's increment, so
    // annual adjustments telescope exactly to the cumulative figure (never double-counted).
    const cumulativeForegone = extraUpfront * (Math.pow(1 + rate, n) - 1);
    const prevForegone = extraUpfront * (Math.pow(1 + rate, n - 1) - 1);
    const opportunityAdjustment = cumulativeForegone - prevForegone;

    years.push({
      year: n,
      highwayKm,
      cityKm,
      totalKm,
      highwayLitres,
      cityLitres,
      totalLitres,
      highwayKwh,
      cityKwh,
      batteryKwh,
      gridKwh,
      energyPrice,
      energyCost,
      maintenance,
      batteryReplacementCost,
      insurance,
      tyres,
      other,
      loanInterest,
      operatingCost,
      purchaseApplied,
      resale: resaleReceived,
      cumulativeCashTco: cumulativeCash,
      opportunityAdjustment,
      cumulativeForegoneEarnings: cumulativeForegone,
      cumulativeEconomicTco: cumulativeCash + cumulativeForegone,
      battery: batteryState,
    });

    totals.energyCost += energyCost;
    totals.maintenanceExBattery += maintenance;
    totals.batteryReplacementTotal += batteryReplacementCost;
    totals.insurance += insurance;
    totals.tyres += tyres;
    totals.other += other;
    totals.loanInterestTotal += loanInterest;
    totals.operatingTotal += operatingCost;
    totals.resale = resaleReceived;
    totals.unitsTotal += v.powertrain === 'petrol' ? totalLitres : gridKwh;
    totals.batteryKwhTotal += batteryKwh;
  }

  if (isEv) {
    // The currently installed battery (possibly installed mid-period or, if the
    // threshold was crossed in the final year, serving zero completed years).
    batteries.push({
      batteryIndex,
      installedYear: batteryInstalledYear,
      accumulatedEfc: cumulativeEfc,
      replacedInYear: null,
    });
  }

  totals.cashTco = cumulativeCash;
  totals.foregoneEarningsAtEnd = extraUpfront * (Math.pow(1 + rate, N) - 1);
  totals.economicTco = cumulativeCash + totals.foregoneEarningsAtEnd;
  totals.totalEfcOriginalBattery = efcOnOriginalBattery;

  const lastBatteryState = [...years].reverse().find((y) => y.battery)?.battery ?? null;
  totals.finalRemainingCapacityKwh = lastBatteryState?.remainingCapacityKwh ?? 0;
  totals.finalRemainingCapacityPercent = lastBatteryState?.remainingCapacityPercent ?? 0;

  if (replacements.length > 0) {
    totals.projectedReplacementYear = replacements[0].replacedInYear;
  } else if (isEv && annualEfcTypical > 0 && v.batteryCycleLife > 0) {
    const cyclesLeft = v.batteryCycleLife - cumulativeEfc;
    const yearsToGo = cyclesLeft > 0 ? Math.ceil(cyclesLeft / annualEfcTypical) : 1;
    totals.projectedReplacementYear = N + yearsToGo;
  }

  return { config: v, isBaseline, years, totals };
}

export function calculateComparison(
  vehicles: VehicleConfig[],
  settings: GlobalSettings,
): ComparisonResult {
  if (vehicles.length === 0) {
    return { ownershipYears: settings.ownershipYears, baselineId: settings.baselineVehicleId, vehicles: [] };
  }
  const baseline =
    vehicles.find((v) => v.id === settings.baselineVehicleId) ?? vehicles[0];
  return {
    ownershipYears: settings.ownershipYears,
    baselineId: baseline.id,
    vehicles: vehicles.map((v) => calculateVehicle(v, settings, baseline)),
  };
}
