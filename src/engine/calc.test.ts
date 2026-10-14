import { describe, expect, it } from 'vitest';
import { calculateComparison, calculateVehicle } from './calc';
import { DEFAULT_SETTINGS, initialState, makeDefaultVehicles, hydrateState } from './defaults';
import { annualRowsToCsv, buildAnnualRows } from './csv';
import { validateSettings, validateVehicle } from './validate';

const HW_KM = 9600; // 800 × 12
const CITY_KM = 4800; // 400 × 12

function defaults() {
  return makeDefaultVehicles();
}

function resultFor(id: string, vehicles = defaults(), settings = DEFAULT_SETTINGS) {
  return calculateVehicle(vehicles.find((v) => v.id === id)!, settings, vehicles[0]);
}

describe('default state', () => {
  it('loads the three vehicles with the specified purchase prices', () => {
    const state = initialState();
    expect(state.vehicles.map((v) => v.purchasePrice)).toEqual([1_370_000, 1_435_000, 1_768_000]);
    expect(state.vehicles.map((v) => v.powertrain)).toEqual(['petrol', 'petrol', 'electric']);
    expect(state.settings).toMatchObject({
      ownershipYears: 15,
      opportunityCostRate: 0.08,
      baselineVehicleId: 'brezza',
    });
  });

  it('calculates every year from 1 through 15', () => {
    const cmp = calculateComparison(defaults(), DEFAULT_SETTINGS);
    for (const vr of cmp.vehicles) {
      expect(vr.years).toHaveLength(15);
      expect(vr.years.map((y) => y.year)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    }
  });

  it('uses the same default driving profile for every vehicle', () => {
    const cmp = calculateComparison(defaults(), DEFAULT_SETTINGS);
    for (const vr of cmp.vehicles) {
      expect(vr.years[0].highwayKm).toBe(HW_KM);
      expect(vr.years[0].cityKm).toBe(CITY_KM);
      expect(vr.years[0].totalKm).toBe(14_400);
    }
  });
});

describe('petrol energy calculations', () => {
  it('computes highway and city consumption independently (Brezza)', () => {
    const y1 = resultFor('brezza').years[0];
    expect(y1.highwayLitres).toBeCloseTo(HW_KM / 17, 6);
    expect(y1.cityLitres).toBeCloseTo(CITY_KM / 11, 6);
    expect(y1.totalLitres).toBeCloseTo(HW_KM / 17 + CITY_KM / 11, 6);
    expect(y1.energyCost).toBeCloseTo((HW_KM / 17 + CITY_KM / 11) * 115, 4);
  });

  it('computes Venue consumption from its own mileage figures', () => {
    const y1 = resultFor('venue').years[0];
    expect(y1.totalLitres).toBeCloseTo(HW_KM / 14.3 + CITY_KM / 9.9, 6);
    expect(y1.energyCost).toBeCloseTo((HW_KM / 14.3 + CITY_KM / 9.9) * 115, 4);
  });

  it('escalates the petrol price by 2% annually (year 5 = 115 × 1.02⁴)', () => {
    const y5 = resultFor('brezza').years[4];
    expect(y5.energyPrice).toBeCloseTo(115 * Math.pow(1.02, 4), 8);
  });

  it('applies mileage degradation separately per year (0.5%)', () => {
    const r = resultFor('brezza');
    const y2 = r.years[1];
    const y2Expected = HW_KM / (17 * 0.995) + CITY_KM / (11 * 0.995);
    expect(y2.totalLitres).toBeCloseTo(y2Expected, 6);
    // Year 15 mileage uses (1 - d)^14
    const y15Expected = HW_KM / (17 * Math.pow(0.995, 14)) + CITY_KM / (11 * Math.pow(0.995, 14));
    expect(r.years[14].totalLitres).toBeCloseTo(y15Expected, 6);
  });
});

describe('electric energy calculations', () => {
  it('computes battery discharge separately for highway and city, then adds charging losses', () => {
    const y1 = resultFor('evitara').years[0];
    const batteryKwh = HW_KM / 4.8 + CITY_KM / 7.0;
    expect(y1.highwayKwh).toBeCloseTo(2000, 6);
    expect(y1.cityKwh).toBeCloseTo(CITY_KM / 7.0, 6);
    expect(y1.batteryKwh).toBeCloseTo(batteryKwh, 6);
    expect(y1.gridKwh).toBeCloseTo(batteryKwh / 0.9, 6);
    expect(y1.energyCost).toBeCloseTo((batteryKwh / 0.9) * 8, 4);
  });

  it('escalates the electricity price by 3% annually (year 5 = 8 × 1.03⁴)', () => {
    const y5 = resultFor('evitara').years[4];
    expect(y5.energyPrice).toBeCloseTo(8 * Math.pow(1.03, 4), 8);
  });

  it('charging losses raise grid draw but NOT equivalent full cycles', () => {
    const y1 = resultFor('evitara').years[0];
    const batteryKwh = HW_KM / 4.8 + CITY_KM / 7.0;
    expect(y1.battery!.annualEfc).toBeCloseTo(batteryKwh / 49, 8);
    expect(y1.battery!.annualEfc).not.toBeCloseTo(y1.gridKwh / 49, 2);
  });

  it('battery capacity degradation is tracked separately from efficiency', () => {
    const r = resultFor('evitara');
    // Efficiency degradation disabled by default → same kWh every year...
    expect(r.years[14].batteryKwh).toBeCloseTo(r.years[0].batteryKwh, 8);
    // ...even though capacity has degraded to 49 × 0.98¹⁴.
    const expectedCapacity = 49 * Math.pow(0.98, 14);
    expect(r.totals.finalRemainingCapacityKwh).toBeCloseTo(expectedCapacity, 6);
    expect(r.totals.finalRemainingCapacityPercent).toBeCloseTo(Math.pow(0.98, 14), 8);
  });

  it('applies efficiency degradation only when enabled', () => {
    const vehicles = defaults();
    const ev = vehicles.find((v) => v.id === 'evitara')!;
    ev.efficiencyDegradationEnabled = true;
    ev.annualEfficiencyDegradation = 0.01;
    const r = calculateVehicle(ev, DEFAULT_SETTINGS, vehicles[0]);
    expect(r.years[14].batteryKwh).toBeGreaterThan(r.years[0].batteryKwh);
    expect(r.years[14].batteryKwh / r.years[0].batteryKwh).toBeCloseTo(
      Math.pow(1 / 0.99, 14),
      6,
    );
  });

  it('scales estimated range in proportion to remaining capacity, keeping efficiency separate', () => {
    const r = resultFor('evitara');
    const frac14 = Math.pow(0.98, 14);
    expect(r.years[14].battery!.highwayRangeKm).toBeCloseTo(235 * frac14, 6);
    expect(r.years[14].battery!.cityRangeKm).toBeCloseTo(343 * frac14, 6);
  });
});

describe('battery cycle counting and automatic replacement', () => {
  it('counts EFCs against rated capacity: ~54.81 EFC/year, ~822 EFC over 15 years at defaults', () => {
    const r = resultFor('evitara');
    const annualEfc = (HW_KM / 4.8 + CITY_KM / 7.0) / 49;
    expect(r.years[0].battery!.annualEfc).toBeCloseTo(annualEfc, 8);
    expect(r.years[14].battery!.cumulativeEfc).toBeCloseTo(annualEfc * 15, 8);
    expect(r.years[14].battery!.remainingCycles).toBeCloseTo(1200 - annualEfc * 15, 8);
  });

  it('triggers no replacement at 1,200 cycles with default energy use', () => {
    const r = resultFor('evitara');
    expect(r.totals.batteryReplacementTotal).toBe(0);
    expect(r.totals.replacements).toHaveLength(0);
    expect(r.totals.projectedReplacementYear).toBe(22); // first year cumulative ≥ 1200
  });

  it('replaces the battery in the first year the threshold is reached or exceeded (800 cycles)', () => {
    const vehicles = defaults();
    vehicles.find((v) => v.id === 'evitara')!.batteryCycleLife = 800;
    const r = calculateVehicle(vehicles.find((v) => v.id === 'evitara')!, DEFAULT_SETTINGS, vehicles[0]);
    // Cumulative crosses 800 during year 15 (822.16 ≥ 800, year 14 = 767.35 < 800)
    expect(r.totals.replacements.map((x) => x.replacedInYear)).toEqual([15]);
    expect(r.years[14].batteryReplacementCost).toBe(800_000);
    expect(r.years.slice(0, 14).every((y) => y.batteryReplacementCost === 0)).toBe(true);
  });

  it('adds the replacement cost to that year, exactly once in every output', () => {
    const vehicles = defaults();
    const ev = vehicles.find((v) => v.id === 'evitara')!;
    ev.batteryCycleLife = 800;
    const r = calculateVehicle(ev, DEFAULT_SETTINGS, vehicles[0]);
    const sumColumn = r.years.reduce((s, y) => s + y.batteryReplacementCost, 0);
    expect(sumColumn).toBe(800_000);
    expect(r.totals.batteryReplacementTotal).toBe(800_000);
    // Operating cost in year 15 includes it exactly once
    const y15 = r.years[14];
    expect(y15.operatingCost).toBe(
      y15.energyCost + y15.maintenance + y15.batteryReplacementCost + y15.insurance + y15.tyres + y15.other,
    );
    // Cumulative cash includes it exactly once: compare against a run with no replacement
    const noRepl = makeDefaultVehicles();
    const r2 = calculateVehicle(noRepl.find((v) => v.id === 'evitara')!, DEFAULT_SETTINGS, noRepl[0]);
    expect(r.totals.cashTco).toBeCloseTo(r2.totals.cashTco + 800_000, 4);
  });

  it('resets the EFC counter and capacity clock after replacement and tracks the new battery independently', () => {
    const vehicles = defaults();
    const ev = vehicles.find((v) => v.id === 'evitara')!;
    ev.batteryCycleLife = 300; // crosses during year 6 (328.9 ≥ 300; year 5 = 274.1 < 300)
    const r = calculateVehicle(ev, DEFAULT_SETTINGS, vehicles[0]);
    const annualEfc = (HW_KM / 4.8 + CITY_KM / 7.0) / 49;
    expect(r.totals.replacements.map((x) => x.replacedInYear)).toEqual([6, 12]);
    expect(r.totals.replacements[0].efcAtReplacement).toBeCloseTo(annualEfc * 6, 6);
    // Year 6 still shows the outgoing battery; year 7 restarts a new one
    expect(r.years[5].battery!.batteryIndex).toBe(0);
    expect(r.years[5].battery!.replacementThisYear).toBe(true);
    expect(r.years[6].battery!.batteryIndex).toBe(1);
    expect(r.years[6].battery!.installedYear).toBe(6);
    expect(r.years[6].battery!.batteryAge).toBe(0);
    expect(r.years[6].battery!.cumulativeEfc).toBeCloseTo(annualEfc, 8);
    expect(r.years[6].battery!.remainingCapacityPercent).toBe(1);
  });

  it('supports repeated replacements when the replacement battery also reaches its limit', () => {
    const vehicles = defaults();
    const ev = vehicles.find((v) => v.id === 'evitara')!;
    ev.batteryCycleLife = 300;
    const r = calculateVehicle(ev, DEFAULT_SETTINGS, vehicles[0]);
    const annualEfc = (HW_KM / 4.8 + CITY_KM / 7.0) / 49;
    // 300 cycles ÷ 54.81 EFC/yr ≈ 5.5 years: original crosses in year 6, the
    // replacement (serving years 7+) crosses again in year 12.
    expect(r.totals.replacements.map((x) => x.replacedInYear)).toEqual([6, 12]);
    expect(r.totals.batteryReplacementTotal).toBeCloseTo(1_600_000, 6);
    expect(r.totals.batteries).toHaveLength(3);
    expect(r.totals.batteries[2]).toMatchObject({ batteryIndex: 2, installedYear: 12 });
    expect(r.totals.batteries[2].accumulatedEfc).toBeCloseTo(annualEfc * 3, 6);
    // Never charged twice for the same replacement
    expect(r.years.reduce((s, y) => s + y.batteryReplacementCost, 0)).toBe(1_600_000);
  });

  it('honours a manual replacement year for scenario testing', () => {
    const vehicles = defaults();
    const ev = vehicles.find((v) => v.id === 'evitara')!;
    ev.manualReplacementYear = 5;
    const r = calculateVehicle(ev, DEFAULT_SETTINGS, vehicles[0]);
    expect(r.totals.replacements.map((x) => x.replacedInYear)).toEqual([5]);
    expect(r.years[4].batteryReplacementCost).toBe(800_000);
    expect(r.years[5].battery!.installedYear).toBe(5);
    expect(r.years[5].battery!.remainingCapacityPercent).toBe(1);
  });

  it('replacements appear in maintenance-year grouping via a separate line item, base maintenance unaffected', () => {
    const vehicles = defaults();
    const ev = vehicles.find((v) => v.id === 'evitara')!;
    ev.batteryCycleLife = 800;
    const r = calculateVehicle(ev, DEFAULT_SETTINGS, vehicles[0]);
    const y15 = r.years[14];
    expect(y15.maintenance).toBeCloseTo(8000 * Math.pow(1.05, 14), 6); // base only
    expect(y15.batteryReplacementCost).toBe(800_000);
  });
});

describe('maintenance, insurance and tyres', () => {
  it('escalates maintenance at 5% from each vehicle’s year-1 base', () => {
    const y15 = (id: string) => resultFor(id).years[14].maintenance;
    expect(y15('brezza')).toBeCloseTo(12_000 * Math.pow(1.05, 14), 4);
    expect(y15('venue')).toBeCloseTo(15_000 * Math.pow(1.05, 14), 4);
    expect(y15('evitara')).toBeCloseTo(8_000 * Math.pow(1.05, 14), 4);
  });

  it('applies the −3% annual insurance change', () => {
    const r = resultFor('brezza');
    expect(r.years[0].insurance).toBeCloseTo(22_000, 6);
    expect(r.years[14].insurance).toBeCloseTo(22_000 * Math.pow(0.97, 14), 4);
  });

  it('models tyres by per-vehicle tyre life with a 50,000 km baseline default', () => {
    for (const v of makeDefaultVehicles()) {
      expect(v.useDetailedTyreModel).toBe(true);
      expect(v.tyreDetail.replacementIntervalKm).toBe(50_000);
    }
    const r = resultFor('brezza');
    // 14,400 km/yr → cumulative distance crosses 50,000 km in years 4, 8 and 12
    expect(r.years.filter((y) => y.tyres > 0).map((y) => y.year)).toEqual([4, 8, 12]);
    expect(r.years[3].tyres).toBe(28_000); // 4 tyres × ₹7,000 per set
    expect(r.years[0].tyres).toBe(0);
    expect(r.totals.tyres).toBe(84_000);
  });

  it('tests the EV at 35,000–40,000 km tyre life: five sets instead of three', () => {
    const vehicles = defaults();
    const ev = vehicles.find((v) => v.id === 'evitara')!;
    const scenario = (life: number) => {
      ev.tyreDetail = { ...ev.tyreDetail, replacementIntervalKm: life };
      const r = calculateVehicle(ev, DEFAULT_SETTINGS, vehicles[0]);
      return {
        years: r.years.filter((y) => y.tyres > 0).map((y) => y.year),
        total: r.totals.tyres,
      };
    };
    expect(scenario(50_000)).toEqual({ years: [4, 8, 12], total: 102_000 }); // 3 × ₹34,000
    expect(scenario(40_000)).toEqual({ years: [3, 6, 9, 12, 15], total: 170_000 });
    expect(scenario(35_000)).toEqual({ years: [3, 6, 9, 12, 15], total: 170_000 });
  });

  it('falls back to the annualized provision only when explicitly selected', () => {
    const vehicles = defaults();
    const b = vehicles.find((v) => v.id === 'brezza')!;
    b.useDetailedTyreModel = false;
    const r = calculateVehicle(b, DEFAULT_SETTINGS, vehicles[0]);
    expect(r.years[0].tyres).toBeCloseTo(7_000, 6);
    expect(r.years[14].tyres).toBeCloseTo(7_000 * Math.pow(1.04, 14), 4);
    expect(r.years.every((y) => y.tyres > 0)).toBe(true);
  });

  it('includes one-time expenses only in the specified year', () => {
    const vehicles = defaults();
    const b = vehicles.find((v) => v.id === 'brezza')!;
    b.otherExpenses = [{ id: 'x1', year: 7, label: 'Major repair', amount: 25_000 }];
    const r = calculateVehicle(b, DEFAULT_SETTINGS, vehicles[0]);
    expect(r.years[6].other).toBe(25_000);
    expect(r.years.filter((y) => y.other > 0)).toHaveLength(1);
    expect(r.totals.other).toBe(25_000);
    expect(r.totals.operatingTotal).toBeCloseTo(
      r.years.reduce((s, y) => s + y.operatingCost, 0),
      4,
    );
  });
});

describe('resale value and final TCO', () => {
  it('deducts the 5% resale value only in the final year', () => {
    const r = resultFor('brezza');
    expect(r.years.slice(0, 14).every((y) => y.resale === 0)).toBe(true);
    expect(r.years[14].resale).toBe(68_500);
    expect(r.totals.resale).toBe(68_500);
  });

  it('supports a fixed resale amount', () => {
    const vehicles = defaults();
    const b = vehicles.find((v) => v.id === 'brezza')!;
    b.resaleMode = 'fixed';
    b.resaleFixed = 100_000;
    const r = calculateVehicle(b, DEFAULT_SETTINGS, vehicles[0]);
    expect(r.years[14].resale).toBe(100_000);
  });

  it('includes the purchase price exactly once and reconciles cumulative cash TCO', () => {
    const r = resultFor('brezza');
    const recomputed = r.years.reduce(
      (acc, y) => acc + y.purchaseApplied + y.operatingCost - y.resale,
      0,
    );
    expect(r.totals.cashTco).toBeCloseTo(recomputed, 4);
    expect(r.years[14].cumulativeCashTco).toBeCloseTo(r.totals.cashTco, 6);
    // Running sum matches year by year
    let running = 0;
    for (const y of r.years) {
      running += y.purchaseApplied + y.operatingCost - y.resale;
      expect(y.cumulativeCashTco).toBeCloseTo(running, 4);
    }
  });

  it('separates purchase price from annual operating expenditure', () => {
    const r = resultFor('brezza');
    expect(r.years[0].purchaseApplied).toBe(1_370_000);
    expect(r.years.slice(1).every((y) => y.purchaseApplied === 0)).toBe(true);
    expect(r.totals.operatingTotal).toBeCloseTo(
      r.years.reduce((s, y) => s + y.operatingCost, 0),
      4,
    );
  });

  it('honours a different ownership period', () => {
    const settings = { ...DEFAULT_SETTINGS, ownershipYears: 10 };
    const r = resultFor('brezza', defaults(), settings);
    expect(r.years).toHaveLength(10);
    expect(r.years[9].resale).toBe(68_500);
    expect(r.years[9].cumulativeCashTco).toBeCloseTo(r.totals.cashTco, 6);
  });
});

describe('opportunity cost of capital', () => {
  it('is zero for the baseline vehicle', () => {
    const r = resultFor('brezza');
    expect(r.totals.extraUpfront).toBe(0);
    expect(r.years.every((y) => y.opportunityAdjustment === 0)).toBe(true);
    expect(r.totals.economicTco).toBeCloseTo(r.totals.cashTco, 6);
  });

  it('computes the Venue’s extra upfront amount and foregone earnings at 8%', () => {
    const r = resultFor('venue');
    expect(r.totals.extraUpfront).toBe(65_000);
    expect(r.years[0].opportunityAdjustment).toBeCloseTo(65_000 * 0.08, 6);
    const expectedCumulative = 65_000 * (Math.pow(1.08, 15) - 1);
    expect(r.totals.foregoneEarningsAtEnd).toBeCloseTo(expectedCumulative, 4);
    expect(r.years[14].cumulativeForegoneEarnings).toBeCloseTo(expectedCumulative, 4);
    expect(r.totals.economicTco).toBeCloseTo(r.totals.cashTco + expectedCumulative, 4);
  });

  it('annual adjustments telescope exactly to the cumulative foregone earnings (no double counting)', () => {
    const cmp = calculateComparison(defaults(), DEFAULT_SETTINGS);
    for (const vr of cmp.vehicles) {
      const sumAdj = vr.years.reduce((s, y) => s + y.opportunityAdjustment, 0);
      expect(sumAdj).toBeCloseTo(vr.totals.foregoneEarningsAtEnd, 4);
      expect(vr.years[14].cumulativeEconomicTco).toBeCloseTo(
        vr.years[14].cumulativeCashTco + vr.years[14].cumulativeForegoneEarnings,
        4,
      );
    }
  });

  it('e Vitara’s foregone earnings are large but not the future value of the whole purchase price', () => {
    const r = resultFor('evitara');
    expect(r.totals.extraUpfront).toBe(398_000);
    const expected = 398_000 * (Math.pow(1.08, 15) - 1);
    expect(r.totals.foregoneEarningsAtEnd).toBeCloseTo(expected, 4);
    expect(expected).toBeLessThan(398_000 * Math.pow(1.08, 15)); // extra only, not full price
  });

  it('shows an opportunity benefit (negative adjustment) when the alternative is cheaper than the baseline', () => {
    const vehicles = defaults();
    const settings = { ...DEFAULT_SETTINGS, baselineVehicleId: 'venue' };
    const r = calculateVehicle(vehicles[0], settings, vehicles[1]); // Brezza vs Venue baseline
    expect(r.totals.extraUpfront).toBe(-65_000);
    expect(r.years[0].opportunityAdjustment).toBeCloseTo(-5_200, 6);
    expect(r.totals.economicTco).toBeCloseTo(r.totals.cashTco - 65_000 * (Math.pow(1.08, 15) - 1), 4);
  });

  it('supports a different baseline selection', () => {
    const cmp = calculateComparison(defaults(), { ...DEFAULT_SETTINGS, baselineVehicleId: 'evitara' });
    const venue = cmp.vehicles.find((v) => v.config.id === 'venue')!;
    expect(venue.totals.extraUpfront).toBe(1_435_000 - 1_768_000); // negative → benefit
    expect(cmp.vehicles.find((v) => v.config.id === 'evitara')!.isBaseline).toBe(true);
  });
});

describe('distance growth (off by default)', () => {
  it('keeps distances constant unless explicitly enabled', () => {
    const r = resultFor('brezza');
    expect(r.years.every((y) => y.totalKm === 14_400)).toBe(true);
  });

  it('grows distances when enabled', () => {
    const settings = { ...DEFAULT_SETTINGS, distanceGrowthEnabled: true, annualDistanceGrowth: 0.03 };
    const r = resultFor('brezza', defaults(), settings);
    expect(r.years[1].totalKm).toBeCloseTo(14_400 * 1.03, 6);
    expect(r.years[2].totalKm).toBeCloseTo(14_400 * 1.03 * 1.03, 6);
  });
});

describe('totals reconciliation (summary cards vs tables)', () => {
  it('every totals field equals the sum of the annual table columns', () => {
    const cmp = calculateComparison(defaults(), DEFAULT_SETTINGS);
    for (const vr of cmp.vehicles) {
      const t = vr.totals;
      expect(t.energyCost).toBeCloseTo(vr.years.reduce((s, y) => s + y.energyCost, 0), 4);
      expect(t.maintenanceExBattery).toBeCloseTo(vr.years.reduce((s, y) => s + y.maintenance, 0), 4);
      expect(t.insurance).toBeCloseTo(vr.years.reduce((s, y) => s + y.insurance, 0), 4);
      expect(t.tyres).toBeCloseTo(vr.years.reduce((s, y) => s + y.tyres, 0), 4);
      expect(t.other).toBeCloseTo(vr.years.reduce((s, y) => s + y.other, 0), 4);
      expect(t.operatingTotal).toBeCloseTo(vr.years.reduce((s, y) => s + y.operatingCost, 0), 4);
      expect(t.cashTco).toBeCloseTo(
        t.purchasePrice + t.operatingTotal - t.resale,
        4,
      );
      expect(t.economicTco).toBeCloseTo(t.cashTco + t.foregoneEarningsAtEnd, 4);
      expect(t.unitsTotal).toBeCloseTo(
        vr.years.reduce((s, y) => s + (vr.config.powertrain === 'petrol' ? y.totalLitres : y.gridKwh), 0),
        4,
      );
    }
  });

  it('operating cost components sum exactly for every year of every vehicle', () => {
    const cmp = calculateComparison(defaults(), DEFAULT_SETTINGS);
    for (const vr of cmp.vehicles) {
      for (const y of vr.years) {
        expect(y.operatingCost).toBeCloseTo(
          y.energyCost + y.maintenance + y.batteryReplacementCost + y.insurance + y.tyres + y.other,
          6,
        );
      }
    }
  });
});

describe('CSV export reconciles with displayed tables', () => {
  it('emits one row per year plus a total row whose values match the engine totals', () => {
    const cmp = calculateComparison(defaults(), DEFAULT_SETTINGS);
    const rows = buildAnnualRows(cmp);
    expect(rows).toHaveLength(15);
    const csv = annualRowsToCsv(cmp, rows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(17); // header + 15 years + total
    const header = lines[0].split(',');
    expect(header[0]).toBe('Year');
    // Brezza cumulative cash column in the total row matches totals.cashTco
    const totalLine = lines[16].split(',');
    const brezzaCashIdx = header.indexOf('Maruti Suzuki Brezza ZXi AT — Cumulative cash TCO ₹');
    expect(parseFloat(totalLine[brezzaCashIdx])).toBeCloseTo(cmp.vehicles[0].totals.cashTco, 2);
    // Annual rows equal the displayed table source rows
    expect(rows[0].cells['brezza'].energyCost).toBeCloseTo(cmp.vehicles[0].years[0].energyCost, 6);
    expect(rows[14].cells['evitara'].cumulativeEfc).toBeCloseTo(
      cmp.vehicles[2].years[14].battery!.cumulativeEfc,
      6,
    );
  });
});

describe('validation', () => {
  it('rejects negative distances and prices, and zero charging efficiency', () => {
    const v = makeDefaultVehicles()[2];
    v.highwayEfficiency = -1;
    v.electricityPrice = -2;
    v.chargingEfficiency = 0;
    v.batteryCycleLife = 0;
    const issues = validateVehicle(v, 15);
    expect(issues).toHaveLength(4);
  });

  it('rejects invalid petrol inputs', () => {
    const v = makeDefaultVehicles()[0];
    v.cityMileage = 0;
    v.fuelPrice = -1;
    const issues = validateVehicle(v, 15);
    expect(issues).toHaveLength(2);
  });

  it('rejects negative driving distances in the shared driving profile', () => {
    const issues = validateSettings({ ...DEFAULT_SETTINGS, monthlyCityKm: -10 });
    expect(issues.some((i) => i.includes('city'))).toBe(true);
  });

  it('accepts the default configuration', () => {
    for (const v of makeDefaultVehicles()) {
      expect(validateVehicle(v, 15)).toEqual([]);
    }
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual([]);
  });

  it('hydrates stale persisted state (missing settings fields) onto the new schema', () => {
    const stale = {
      settings: { ownershipYears: 12 },
      vehicles: [{ id: 'old', name: 'Old car', powertrain: 'petrol', purchasePrice: 500_000 }],
    };
    const state = hydrateState(stale);
    expect(state.settings.monthlyHighwayKm).toBe(800);
    expect(state.settings.monthlyCityKm).toBe(400);
    expect(state.settings.ownershipYears).toBe(12);
    expect(state.vehicles[0].fuelPrice).toBe(115); // template fills missing defaults
    expect(state.vehicles).toHaveLength(1);
    expect(state.settings.baselineVehicleId).toBe('old'); // falls back to first vehicle
  });
});
