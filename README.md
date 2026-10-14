# 15-Year Vehicle TCO Calculator — Petrol vs Electric (India)

An interactive web app that compares the 15-year Total Cost of Ownership of petrol and
electric vehicles in India. Preloaded with three vehicles (all values editable):

1. Maruti Suzuki Brezza ZXi AT (petrol)
2. Hyundai Venue HX6 DCT Turbo (petrol)
3. Maruti Suzuki e Vitara Delta (electric)

## Quick start

```bash
npm install
npm run dev        # dev server
npm test           # 45 unit tests for the calculation engine
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run compare    # print the default-scenario comparison to the terminal
```

## Features

- **Shared driving profile**: monthly highway/city distances are global settings applied
  to every vehicle (no per-vehicle driving inputs). Optional annual distance growth is
  off by default.
- **Range is EV-only**: rated highway/city range lives in the battery panel and feeds
  the capacity-scaled range estimates; petrol vehicles carry no range fields.
- **Year-by-year engine (Year 1–15)**: separate highway/city consumption, petrol price
  escalation (default 2%/yr) with mileage degradation (0.5%/yr), electricity escalation
  (3%/yr) with charging losses (90% efficiency → grid kWh = battery kWh ÷ 0.9).
- **Battery model**: capacity fade is **cycle-based** — calibrated so the battery
  retains 80% of rated capacity at the cycle-life limit (configurable), fading with
  charge cycles rather than calendar time and resetting on replacement. Equivalent full
  cycles are counted against rated capacity (charging losses do **not** inflate the
  counter); automatic battery replacement when the installed battery's cumulative EFCs
  reach the cycle-life limit (default 1,200), with counter and capacity-clock reset,
  repeated-replacement support, manual replacement year for scenario testing, and
  cycle-life scenarios (800/1,000/1,200/1,500/2,000).
- **Cash TCO vs Economic TCO**: opportunity cost of the extra upfront capital vs the
  selected baseline (default Brezza) at 8%/yr, shown as a separate, clearly-labelled
  economic adjustment — annual adjustments telescope exactly to the cumulative figure,
  never double-counted. A cheaper-than-baseline vehicle shows an opportunity benefit.
- **Resale value** (5% of purchase price by default) deducted only in the final year.
- **Outputs**: interactive chart (annual opex / cumulative cash / cumulative economic,
  with battery-replacement markers), annual TCO table with totals, maintenance/tyres/
  insurance table with expandable breakdowns and replacement-year highlighting, summary
  cards (cheapest in cash and economic terms), a battery condition + replacement history
  panel with range estimates scaled to remaining capacity, and a static feature/spec
  comparison table for the three models (reference only — it does not feed the maths).
- **Interactions**: add / duplicate / remove vehicles, edit every assumption (inputs are
  validated; negatives and zero charging efficiency are prevented), choose baseline,
  one-time expenses in any year, optional annual distance growth (off by default).
- **Tyres by tyre life**: the default model replaces all tyres when the vehicle reaches
  its per-vehicle **tyre life** (km per set, baseline 50,000 km for all three). Quick
  scenario buttons let a heavier EV be tested at 35,000–40,000 km — a what-if, since
  weight alone doesn't determine tyre life. An annualized provision (₹/yr + escalation)
  remains available as an explicit opt-out; the two methods are never applied together.
- **Exports & scenarios**: CSV of the annual table (same data source as the displayed
  table, so values reconcile), full JSON report (assumptions + results), and browser-local
  saved scenarios (no backend; current state also persists across reloads).

## Architecture

```
src/engine/       pure TypeScript calculation engine (no React)
  types.ts        data model            defaults.ts   the three vehicles + settings
  calc.ts         yearly simulation     csv.ts        table rows + CSV/report export
  validate.ts     input validation      storage.ts    localStorage scenarios
  format.ts       ₹ / lakh / crore Indian formatting
src/engine/calc.test.ts   45 Vitest unit tests covering every major calculation
src/components/   React UI (settings, vehicle panels, chart, tables, battery section)
scripts/comparison.ts     prints the default comparison via the same engine
```

Key formulas (Year n, unrounded intermediates):

- Petrol: litres = highwayKm/mileageₙ + cityKm/mileageₙ; priceₙ = P·(1+e)ⁿ⁻¹
- EV: battery kWh = highwayKm/effₙ + cityKm/effₙ; grid kWh = battery/chargingEff;
  EFCₙ = battery kWh / rated capacity
- Cumulative cash TCOₙ = purchase + Σ opex − resale (final year only)
- Cumulative foregone earningsₙ = extraUpfront·((1+r)ⁿ − 1); economic TCO = cash + that

All default values are planning assumptions, not guarantees or official manufacturer
specifications. The 1,200-cycle life and ₹8 lakh battery replacement are user-editable
sensitivity assumptions, not confirmed specifications or predictions.
