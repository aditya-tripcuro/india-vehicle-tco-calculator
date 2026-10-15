import type { ComparisonResult, VehicleResult } from '../engine/types';
import { formatCompact, formatNumber } from '../engine/format';
import { VEHICLE_COLORS } from './VehiclePanel';

function summaryRow(label: string, value: string, cls?: string) {
  return { label, value, cls };
}

function vehicleRows(vr: VehicleResult, baseline: VehicleResult | undefined, ownershipYears: number): Array<{ label: string; value: string; cls?: string }> {
  const t = vr.totals;
  const y = (n: number) => vr.years[Math.min(n, ownershipYears) - 1];
  const cashAt = (n: number) => (ownershipYears >= n ? formatCompact(y(n).cumulativeCashTco) : '—');
  const econAt = (n: number) => (ownershipYears >= n ? formatCompact(y(n).cumulativeEconomicTco) : '—');
  const isEv = vr.config.powertrain === 'electric';

  const energyUnits = vr.config.powertrain === 'petrol'
    ? `${formatNumber(t.unitsTotal)} L petrol`
    : `${formatNumber(t.unitsTotal)} kWh grid`;
  const batteryLabel = isEv
    ? t.batteries
        .map((b) => `B${b.batteryIndex + 1}: ${formatNumber(b.accumulatedEfc, 0)} EFC${b.replacedInYear ? ` (repl. Y${b.replacedInYear})` : ''}`)
        .join(' · ')
    : '—';

  const diff = baseline && !vr.isBaseline ? t.cashTco - baseline.totals.cashTco : null;
  const diffEcon = baseline && !vr.isBaseline ? t.economicTco - baseline.totals.economicTco : null;

  const rows = [
    summaryRow('Purchase price', formatCompact(vr.config.purchasePrice)),
    summaryRow('Year 1 operating expenditure', formatCompact(vr.years[0].operatingCost)),
    summaryRow('Year 5 cumulative cash TCO', cashAt(5)),
    summaryRow('Year 5 cumulative economic TCO', econAt(5)),
    summaryRow('Year 10 cumulative cash TCO', cashAt(10)),
    summaryRow('Year 10 cumulative economic TCO', econAt(10)),
    summaryRow(`Year ${ownershipYears} cumulative cash TCO`, formatCompact(t.cashTco)),
    summaryRow(`Year ${ownershipYears} cumulative economic TCO`, formatCompact(t.economicTco)),
    { label: 'divider', value: '', cls: 'divider' },
    summaryRow('Total energy expenditure', formatCompact(t.energyCost)),
    summaryRow(energyUnits, '', ''),
    summaryRow('Total maintenance & servicing', formatCompact(t.maintenanceExBattery)),
    summaryRow('Total insurance', formatCompact(t.insurance)),
    summaryRow('Total tyres', formatCompact(t.tyres)),
    summaryRow('Total one-time / other', formatCompact(t.other)),
    summaryRow('Battery replacement expenditure', formatCompact(t.batteryReplacementTotal)),
    summaryRow('Resale value (deducted in final year)', formatCompact(t.resale)),
    { label: 'divider', value: '', cls: 'divider' },
    summaryRow('EFC per installed battery', batteryLabel),
    isEv
      ? summaryRow(
          `Battery capacity at Year ${ownershipYears}`,
          `${t.finalRemainingCapacityKwh.toFixed(1)} kWh (${(t.finalRemainingCapacityPercent * 100).toFixed(1)}%)`,
        )
      : summaryRow('Battery capacity at Year ' + ownershipYears, '—'),
    summaryRow('Battery replacements', isEv ? String(t.replacements.length) : '—'),
    summaryRow(
      diff != null ? 'Cash TCO vs baseline' : 'Cash TCO vs baseline',
      diff != null
        ? `${diff <= 0 ? '−' : '+'}${formatCompact(Math.abs(diff)).replace('₹', '₹')} (${diff <= 0 ? 'cheaper' : 'costlier'})`
        : 'baseline vehicle',
      diff == null ? undefined : diff <= 0 ? 'neg' : 'pos',
    ),
    summaryRow(
      'Economic TCO vs baseline',
      diffEcon != null
        ? `${diffEcon <= 0 ? '−' : '+'}${formatCompact(Math.abs(diffEcon))} (${diffEcon <= 0 ? 'cheaper' : 'costlier'})`
        : 'baseline vehicle',
      diffEcon == null ? undefined : diffEcon <= 0 ? 'neg' : 'pos',
    ),
  ];
  return rows;
}

export function SummaryCards({ comparison }: { comparison: ComparisonResult }) {
  if (comparison.vehicles.length === 0) return null;
  const baseline = comparison.vehicles.find((v) => v.isBaseline) ?? comparison.vehicles[0];
  const cheapestCash = [...comparison.vehicles].sort((a, b) => a.totals.cashTco - b.totals.cashTco)[0];
  const cheapestEcon = [...comparison.vehicles].sort((a, b) => a.totals.economicTco - b.totals.economicTco)[0];

  return (
    <>
      <div className="winners-banner">
        <span className="winner-pill">
          Least expensive, cash TCO: {cheapestCash.config.name} — {formatCompact(cheapestCash.totals.cashTco)}
        </span>
        <span className="winner-pill">
          Least expensive, economic TCO: {cheapestEcon.config.name} — {formatCompact(cheapestEcon.totals.economicTco)}
        </span>
      </div>
      <div className="summary-grid">
        {comparison.vehicles.map((vr, i) => (
          <div className="card summary-card" key={vr.config.id}>
            <div className="summary-card-head">
              <span className="dot" style={{ width: 12, height: 12, borderRadius: 999, background: VEHICLE_COLORS[i % VEHICLE_COLORS.length] }} />
              <span className="name">{vr.config.name}</span>
              {vr.isBaseline && <span className="chip accent">Baseline</span>}
              {vr.config.id === cheapestCash.config.id && <span className="chip good">Lowest cash TCO</span>}
              {vr.config.id === cheapestEcon.config.id && vr.config.id !== cheapestCash.config.id && (
                <span className="chip good">Lowest economic TCO</span>
              )}
            </div>
            <dl>
              {vehicleRows(vr, baseline, comparison.ownershipYears).map((r, j) =>
                r.cls === 'divider' ? (
                  <div className="divider" key={j} />
                ) : (
                  <div style={{ display: 'contents' }} key={j}>
                    <dt>{r.label}</dt>
                    <dd className={r.cls}>{r.value}</dd>
                  </div>
                ),
              )}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
