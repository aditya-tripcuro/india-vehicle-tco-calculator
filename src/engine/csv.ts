import type { AppState, ComparisonResult, VehicleResult } from './types';

/** Structured annual rows shared by the on-screen table and the CSV export, so
 *  exported values reconcile with the displayed table by construction. */

export interface AnnualCsvCell {
  units: number; // litres (petrol) or grid kWh (EV)
  energyPrice: number;
  energyCost: number;
  maintenance: number;
  batteryReplacement: number;
  insurance: number;
  tyres: number;
  other: number;
  operating: number;
  purchase: number;
  cumulativeCash: number;
  opportunityAdjustment: number;
  cumulativeEconomic: number;
  remainingCapacityKwh: number | null;
  remainingCapacityPercent: number | null;
  cumulativeEfc: number | null;
}

export interface AnnualRow {
  year: number;
  highwayKm: number;
  cityKm: number;
  totalKm: number;
  cells: Record<string, AnnualCsvCell>;
}

export function buildAnnualRows(comparison: ComparisonResult): AnnualRow[] {
  const rows: AnnualRow[] = [];
  const n = comparison.vehicles[0]?.years.length ?? 0;
  for (let i = 0; i < n; i++) {
    const first = comparison.vehicles[0].years[i];
    const cells: Record<string, AnnualCsvCell> = {};
    for (const vr of comparison.vehicles) {
      const y = vr.years[i];
      cells[vr.config.id] = {
        units: vr.config.powertrain === 'petrol' ? y.totalLitres : y.gridKwh,
        energyPrice: y.energyPrice,
        energyCost: y.energyCost,
        maintenance: y.maintenance,
        batteryReplacement: y.batteryReplacementCost,
        insurance: y.insurance,
        tyres: y.tyres,
        other: y.other,
        operating: y.operatingCost,
        purchase: y.purchaseApplied,
        cumulativeCash: y.cumulativeCashTco,
        opportunityAdjustment: y.opportunityAdjustment,
        cumulativeEconomic: y.cumulativeEconomicTco,
        remainingCapacityKwh: y.battery?.remainingCapacityKwh ?? null,
        remainingCapacityPercent: y.battery?.remainingCapacityPercent ?? null,
        cumulativeEfc: y.battery?.cumulativeEfc ?? null,
      };
    }
    rows.push({
      year: first.year,
      highwayKm: first.highwayKm,
      cityKm: first.cityKm,
      totalKm: first.totalKm,
      cells,
    });
  }
  return rows;
}

function esc(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const f2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '');

export function annualRowsToCsv(comparison: ComparisonResult, rows: AnnualRow[]): string {
  const header: string[] = ['Year', 'Highway km', 'City km', 'Total km'];
  for (const vr of comparison.vehicles) {
    const unitName = vr.config.powertrain === 'petrol' ? 'Petrol litres' : 'Grid electricity kWh';
    const name = vr.config.name;
    header.push(
      `${name} — ${unitName}`,
      `${name} — ${vr.config.powertrain === 'petrol' ? 'Petrol price ₹/l' : 'Electricity price ₹/kWh'}`,
      `${name} — Energy cost ₹`,
      `${name} — Maintenance & servicing ₹`,
      `${name} — Battery replacement ₹`,
      `${name} — Insurance ₹`,
      `${name} — Tyres ₹`,
      `${name} — Other ₹`,
      `${name} — Total operating ₹`,
      `${name} — Purchase ₹`,
      `${name} — Cumulative cash TCO ₹`,
      `${name} — Opportunity adjustment ₹`,
      `${name} — Cumulative economic TCO ₹`,
    );
    if (vr.config.powertrain === 'electric') {
      header.push(
        `${name} — Battery capacity kWh`,
        `${name} — Remaining capacity %`,
        `${name} — Cumulative EFC`,
      );
    }
  }

  const lines = [header.map(esc).join(',')];
  for (const row of rows) {
    const line: string[] = [
      String(row.year),
      f2(row.highwayKm),
      f2(row.cityKm),
      f2(row.totalKm),
    ];
    for (const vr of comparison.vehicles) {
      const c = row.cells[vr.config.id];
      line.push(
        f2(c.units),
        f2(c.energyPrice),
        f2(c.energyCost),
        f2(c.maintenance),
        f2(c.batteryReplacement),
        f2(c.insurance),
        f2(c.tyres),
        f2(c.other),
        f2(c.operating),
        f2(c.purchase),
        f2(c.cumulativeCash),
        f2(c.opportunityAdjustment),
        f2(c.cumulativeEconomic),
      );
      if (vr.config.powertrain === 'electric') {
        line.push(
          c.remainingCapacityKwh != null ? f2(c.remainingCapacityKwh) : '',
          c.remainingCapacityPercent != null ? (c.remainingCapacityPercent * 100).toFixed(2) : '',
          c.cumulativeEfc != null ? f2(c.cumulativeEfc) : '',
        );
      }
    }
    lines.push(line.join(','));
  }

  // Total row: sums for flow columns, final values for cumulative columns.
  const total: string[] = ['TOTAL', '', '', ''];
  for (const vr of comparison.vehicles) {
    const t = vr.totals;
    const last = vr.years[vr.years.length - 1];
    total.push(
      f2(t.unitsTotal),
      f2(last.energyPrice),
      f2(t.energyCost),
      f2(t.maintenanceExBattery + t.batteryReplacementTotal),
      f2(t.batteryReplacementTotal),
      f2(t.insurance),
      f2(t.tyres),
      f2(t.other),
      f2(t.operatingTotal),
      f2(t.purchasePrice),
      f2(t.cashTco),
      f2(t.foregoneEarningsAtEnd),
      f2(t.economicTco),
    );
    if (vr.config.powertrain === 'electric') {
      total.push(
        f2(t.finalRemainingCapacityKwh),
        (t.finalRemainingCapacityPercent * 100).toFixed(2),
        f2(vr.years[vr.years.length - 1].battery?.cumulativeEfc ?? 0),
      );
    }
  }
  lines.push(total.join(','));
  return lines.join('\n');
}

export function buildFullReport(state: AppState, comparison: ComparisonResult) {
  return {
    generatedAt: new Date().toISOString(),
    description:
      '15-year vehicle Total Cost of Ownership comparison (India). All figures are planning assumptions, not guarantees.',
    assumptions: {
      settings: state.settings,
      vehicles: state.vehicles,
    },
    results: comparison.vehicles.map((vr: VehicleResult) => ({
      vehicle: vr.config.name,
      isBaseline: vr.isBaseline,
      totals: vr.totals,
      years: vr.years,
    })),
  };
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
