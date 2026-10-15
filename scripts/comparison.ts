/** Prints the default-scenario comparison of the three preloaded vehicles.
 *  Run with: npx vite-node scripts/comparison.ts */
import { initialState } from '../src/engine/defaults';
import { calculateComparison } from '../src/engine/calc';

const state = initialState();
const cmp = calculateComparison(state.vehicles, state.settings);
const lakh = (n: number) => `₹${(n / 1e5).toFixed(2)} L`;
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

console.log('=== DEFAULT SCENARIO (15 years, 14,400 km/yr) ===\n');

for (const vr of cmp.vehicles) {
  const t = vr.totals;
  console.log(`${vr.config.name}${vr.isBaseline ? '  [baseline]' : ''}`);
  console.log(`  Purchase price:               ${inr(vr.config.purchasePrice)}`);
  console.log(`  Year 1 opex:                  ${inr(vr.years[0].operatingCost)}`);
  console.log(`  Y5 / Y10 cumulative cash:     ${lakh(vr.years[4].cumulativeCashTco)} / ${lakh(vr.years[9].cumulativeCashTco)}`);
  console.log(`  15-yr cumulative cash TCO:    ${lakh(t.cashTco)}`);
  console.log(`  15-yr cumulative economic:    ${lakh(t.economicTco)} (foregone earnings ${lakh(t.foregoneEarningsAtEnd)})`);
  console.log(`  Energy total:                 ${lakh(t.energyCost)} (${Math.round(t.unitsTotal).toLocaleString('en-IN')} ${vr.config.powertrain === 'petrol' ? 'L' : 'kWh'})`);
  console.log(`  Maintenance / ins / tyres:    ${lakh(t.maintenanceExBattery)} / ${lakh(t.insurance)} / ${lakh(t.tyres)}`);
  console.log(`  Battery replacements:         ${t.replacements.length} (spend ${lakh(t.batteryReplacementTotal)})`);
  console.log(`  Resale:                       ${lakh(t.resale)}`);
  if (vr.config.powertrain === 'electric') {
    console.log(`  Battery at Y15:               ${t.finalRemainingCapacityKwh.toFixed(1)} kWh (${(t.finalRemainingCapacityPercent * 100).toFixed(1)}%), ${t.totalEfcOriginalBattery.toFixed(0)} EFC used, next repl ~Y${t.projectedReplacementYear}`);
  }
  console.log('');
}

const [brezza, venue, ev] = cmp.vehicles;
console.log('=== DIFFERENCES vs BREZZA (baseline) ===');
console.log(`Venue    cash: ${lakh(venue.totals.cashTco - brezza.totals.cashTco)}   economic: ${lakh(venue.totals.economicTco - brezza.totals.economicTco)}`);
console.log(`e Vitara cash: ${lakh(ev.totals.cashTco - brezza.totals.cashTco)}   economic: ${lakh(ev.totals.economicTco - brezza.totals.economicTco)}`);

// Crossover year: first year EV cumulative cash <= Brezza cumulative cash
const crossCash = ev.years.findIndex((y, i) => y.cumulativeCashTco <= brezza.years[i].cumulativeCashTco);
const crossEcon = ev.years.findIndex((y, i) => y.cumulativeEconomicTco <= brezza.years[i].cumulativeEconomicTco);
console.log(`\nEV vs Brezza cumulative cash crossover: year ${crossCash + 1}`);
console.log(`EV vs Brezza cumulative economic crossover: year ${crossEcon + 1}`);

console.log('\n=== BATTERY SENSITIVITY (e Vitara cash TCO by cycle life) ===');
for (const cycles of [800, 1000, 1200, 1500, 2000]) {
  const vs = state.vehicles.map((v) =>
    v.id === 'evitara' ? { ...v, batteryCycleLife: cycles } : v,
  );
  const r = calculateComparison(vs, state.settings).vehicles.find((x) => x.config.id === 'evitara')!;
  console.log(
    `${cycles} cycles: replacements in [${r.totals.replacements.map((x) => 'Y' + x.replacedInYear).join(', ') || 'none'}], spend ${lakh(r.totals.batteryReplacementTotal)}, 15-yr cash TCO ${lakh(r.totals.cashTco)}`,
  );
}

console.log('\n=== TYRE-LIFE MODEL (baseline 50,000 km per set for all three) ===');
for (const vr of cmp.vehicles) {
  const years = vr.years.filter((y) => y.tyres > 0).map((y) => y.year);
  console.log(
    `${vr.config.name}: sets in [${years.map((y) => 'Y' + y).join(', ')}], total tyres ${lakh(vr.totals.tyres)}`,
  );
}

console.log('\n=== TYRE-LIFE SENSITIVITY (e Vitara; heavier car → shorter life what-if) ===');
for (const life of [50_000, 40_000, 35_000]) {
  const vs = state.vehicles.map((v) =>
    v.id === 'evitara' ? { ...v, tyreDetail: { ...v.tyreDetail, replacementIntervalKm: life } } : v,
  );
  const r = calculateComparison(vs, state.settings).vehicles.find((x) => x.config.id === 'evitara')!;
  const years = r.years.filter((y) => y.tyres > 0).map((y) => 'Y' + y.year);
  console.log(
    `${life / 1000}k km: sets in [${years.join(', ')}], tyres ${lakh(r.totals.tyres)}, 15-yr cash TCO ${lakh(r.totals.cashTco)}, vs Brezza ${lakh(r.totals.cashTco - brezza.totals.cashTco)}`,
  );
}

console.log('\n=== RUNNING COSTS PER YEAR (Year 1 → Year 15 opex) ===');
for (const vr of cmp.vehicles) {
  console.log(`${vr.config.name}: ${inr(vr.years[0].operatingCost)} → ${inr(vr.years[14].operatingCost)}`);
}

console.log('\n=== OWNERSHIP-LENGTH CHECKPOINTS (cash / economic TCO) ===');
for (const years of [5, 10, 15]) {
  const s = { ...state.settings, ownershipYears: years };
  const cmpY = calculateComparison(state.vehicles, s);
  const parts = cmpY.vehicles.map((vr) => {
    const b = cmpY.vehicles.find((x) => x.config.id === 'brezza')!;
    const diff = vr.isBaseline ? '' : ` (${vr.totals.cashTco - b.totals.cashTco >= 0 ? '+' : '−'}${lakh(Math.abs(vr.totals.cashTco - b.totals.cashTco))})`;
    return `${vr.config.name.split(' ').slice(-2).join(' ')}: ${lakh(vr.totals.cashTco)} / ${lakh(vr.totals.economicTco)}${diff}, resale ${lakh(vr.totals.resale)}`;
  });
  console.log(`Year ${years}: ${parts.join('  |  ')}`);
}

console.log('\n=== EV vs BREZZA ANNUAL OPEX SAVINGS ===');
for (let i = 0; i < 15; i++) {
  const saving = brezza.years[i].operatingCost - ev.years[i].operatingCost;
  console.log(`Y${i + 1}: ${inr(saving)}`);
}
